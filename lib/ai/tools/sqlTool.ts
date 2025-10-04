import 'server-only';
import { getPool, sql } from '@/lib/db/mssql';
import { appendExecution } from '@/lib/ai/agent/store';
import { clampRows } from '@/lib/ai/sqlSafety';
import { getSetting, setSetting } from '@/lib/ai/agent/store';
import type { ToolContext, ToolResult } from './types';

type SqlToolOperation =
  | 'waitStatsDiff'
  | 'blockingTree'
  | 'topCpuQueries'
  | 'topDurationQueries'
  | 'fragmentation'
  | 'indexUsage'
  | 'largeHeaps';

export type SqlToolInput = {
  operation: SqlToolOperation;
  top?: number;
  database?: string;
};

const benignWaits = [
  'SLEEP_TASK',
  'BROKER_TASK_STOP',
  'BROKER_EVENTHANDLER',
  'LAZYWRITER_SLEEP',
  'XE_TIMER_EVENT',
  'XE_DISPATCHER_WAIT',
  'SQLTRACE_BUFFER_FLUSH',
  'BROKER_RECEIVE_WAITFOR'
];

async function executeQuery<T>(sessionId: string, sqlText: string, params: Record<string, unknown> = {}): Promise<T[]> {
  const pool = await getPool();
  const request = pool.request();
  for (const [name, value] of Object.entries(params)) {
    request.input(name, sql.Variant, value as never);
  }
  const result = await request.query<T>(sqlText);
  await appendExecution(sessionId, 'sql', {
    sqlText,
    resultJson: JSON.stringify({ rows: result.recordset.length }),
    succeeded: true
  });
  return result.recordset;
}

export async function runSqlTool(input: SqlToolInput, context: ToolContext): Promise<ToolResult> {
  const { sessionId } = context;
  switch (input.operation) {
    case 'waitStatsDiff': {
      const rows = await executeQuery<{
        wait_type: string;
        wait_time_ms: number;
        waiting_tasks_count: number;
        signal_wait_time_ms: number;
      }>(
        sessionId,
        `SELECT wait_type, wait_time_ms, waiting_tasks_count, signal_wait_time_ms
         FROM sys.dm_os_wait_stats WITH (NOLOCK)
         WHERE wait_type NOT IN (${benignWaits.map((w) => `'${w}'`).join(',')})`
      );
      const snapshotKey = 'waitStatsSnapshot';
      const previousRaw = await getSetting(snapshotKey);
      const previous = previousRaw ? (JSON.parse(previousRaw) as Record<string, { wait_time_ms: number; waiting_tasks_count: number; signal_wait_time_ms: number }>) : {};
      const nowSnapshot: Record<string, { wait_time_ms: number; waiting_tasks_count: number; signal_wait_time_ms: number }> = {};
      const diffs = rows.map((row) => {
        nowSnapshot[row.wait_type] = {
          wait_time_ms: row.wait_time_ms,
          waiting_tasks_count: row.waiting_tasks_count,
          signal_wait_time_ms: row.signal_wait_time_ms
        };
        const prior = previous[row.wait_type] ?? { wait_time_ms: 0, waiting_tasks_count: 0, signal_wait_time_ms: 0 };
        return {
          waitType: row.wait_type,
          waitTimeDiffMs: Math.max(0, row.wait_time_ms - prior.wait_time_ms),
          waitingTasksDiff: Math.max(0, row.waiting_tasks_count - prior.waiting_tasks_count),
          signalWaitDiffMs: Math.max(0, row.signal_wait_time_ms - prior.signal_wait_time_ms)
        };
      });
      await setSetting(snapshotKey, JSON.stringify(nowSnapshot));
      return { ok: true, data: clampRows(diffs.sort((a, b) => b.waitTimeDiffMs - a.waitTimeDiffMs), input.top ?? 20) };
    }
    case 'blockingTree': {
      const rows = await executeQuery<{
        session_id: number;
        blocking_session_id: number | null;
        wait_type: string | null;
        resource_description: string | null;
        wait_duration_ms: number | null;
        request_mode: string | null;
        database_name: string | null;
      }>(
        sessionId,
        `WITH blocking AS (
           SELECT wt.session_id,
                  wt.blocking_session_id,
                  wt.wait_type,
                  wt.resource_description,
                  wt.wait_duration_ms,
                  tl.request_mode,
                  DB_NAME(tl.resource_database_id) AS database_name
           FROM sys.dm_os_waiting_tasks wt
           INNER JOIN sys.dm_tran_locks tl ON wt.resource_address = tl.lock_owner_address
           WHERE wt.blocking_session_id <> 0
         )
         SELECT TOP (${input.top ?? 50}) * FROM blocking`
      );
      return { ok: true, data: rows };
    }
    case 'topCpuQueries':
    case 'topDurationQueries': {
      const orderColumn = input.operation === 'topCpuQueries' ? 'avg_cpu_time' : 'avg_duration';
      const rows = await executeQuery<{
        query_id: number;
        query_sql_text: string;
        avg_cpu_time: number;
        avg_duration: number;
        count_executions: number;
      }>(
        sessionId,
        `IF EXISTS (SELECT 1 FROM sys.database_query_store_options WHERE actual_state = 1)
         BEGIN
           SELECT TOP (${input.top ?? 20})
             qs.query_id,
             qt.query_sql_text,
             rs.avg_cpu_time,
             rs.avg_duration,
             rs.count_executions
           FROM sys.query_store_query_text qt
           INNER JOIN sys.query_store_query qs ON qt.query_text_id = qs.query_text_id
           INNER JOIN sys.query_store_plan qp ON qs.query_id = qp.query_id
           INNER JOIN sys.query_store_runtime_stats rs ON qp.plan_id = rs.plan_id
           INNER JOIN sys.query_store_runtime_stats_interval rsi ON rs.runtime_stats_interval_id = rsi.runtime_stats_interval_id
           WHERE rsi.start_time >= DATEADD(hour, -24, SYSUTCDATETIME())
           ORDER BY ${orderColumn} DESC;
         END
         ELSE
         BEGIN
           SELECT TOP (${input.top ?? 20})
             qs.query_hash AS query_id,
             SUBSTRING(st.text, (qs.statement_start_offset/2)+1,
               CASE WHEN qs.statement_end_offset = -1 THEN LEN(CONVERT(nvarchar(max), st.text))
               ELSE (qs.statement_end_offset - qs.statement_start_offset)/2 + 1 END) AS query_sql_text,
             qs.total_worker_time/qs.execution_count AS avg_cpu_time,
             qs.total_elapsed_time/qs.execution_count AS avg_duration,
             qs.execution_count AS count_executions
           FROM sys.dm_exec_query_stats qs
           CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) st
           ORDER BY ${orderColumn} DESC;
         END`
      );
      return { ok: true, data: rows };
    }
    case 'fragmentation': {
      const rows = await executeQuery<{
        database_name: string;
        schema_name: string;
        object_name: string;
        index_name: string;
        avg_fragmentation_in_percent: number;
        page_count: number;
      }>(
        sessionId,
        `SELECT TOP (${input.top ?? 20})
           DB_NAME(database_id) AS database_name,
           OBJECT_SCHEMA_NAME(object_id, database_id) AS schema_name,
           OBJECT_NAME(object_id, database_id) AS object_name,
           index_id,
           avg_fragmentation_in_percent,
           page_count,
           i.name AS index_name
         FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'SAMPLED') s
         INNER JOIN sys.indexes i ON s.object_id = i.object_id AND s.index_id = i.index_id
         WHERE page_count > 1000 AND avg_fragmentation_in_percent > 10
         ORDER BY avg_fragmentation_in_percent DESC`
      );
      return { ok: true, data: rows };
    }
    case 'indexUsage': {
      const rows = await executeQuery<{
        database_name: string;
        schema_name: string;
        object_name: string;
        index_name: string;
        user_seeks: number;
        user_scans: number;
        user_lookups: number;
        user_updates: number;
      }>(
        sessionId,
        `SELECT TOP (${input.top ?? 50})
           DB_NAME(database_id) AS database_name,
           OBJECT_SCHEMA_NAME(object_id, database_id) AS schema_name,
           OBJECT_NAME(object_id, database_id) AS object_name,
           i.name AS index_name,
           user_seeks,
           user_scans,
           user_lookups,
           user_updates
         FROM sys.dm_db_index_usage_stats us
         INNER JOIN sys.indexes i ON us.object_id = i.object_id AND us.index_id = i.index_id
         WHERE database_id = DB_ID()
         ORDER BY (user_seeks + user_scans + user_lookups) DESC`
      );
      return { ok: true, data: rows };
    }
    case 'largeHeaps': {
      const rows = await executeQuery<{
        schema_name: string;
        table_name: string;
        row_count: number;
        reserved_mb: number;
      }>(
        sessionId,
        `SELECT TOP (${input.top ?? 20})
           s.name AS schema_name,
           t.name AS table_name,
           SUM(p.rows) AS row_count,
           SUM(a.total_pages) / 128.0 AS reserved_mb
         FROM sys.tables t
         INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
         INNER JOIN sys.indexes i ON t.object_id = i.object_id AND i.index_id <= 1
         INNER JOIN sys.partitions p ON i.object_id = p.object_id AND i.index_id = p.index_id
         INNER JOIN sys.allocation_units a ON p.partition_id = a.container_id
         WHERE i.index_id = 0
         GROUP BY s.name, t.name
         ORDER BY SUM(p.rows) DESC`
      );
      return { ok: true, data: rows };
    }
    default:
      return { ok: false, error: `Unsupported SqlTool operation: ${input.operation}` };
  }
}
