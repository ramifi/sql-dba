import 'server-only';
import { getPool, sql } from '@/lib/db/mssql';
import { appendExecution } from '@/lib/ai/agent/store';
import type { ToolContext, ToolResult } from './types';

export type MetricsToolInput = {
  scope: 'overview';
};

export async function runMetricsTool(_input: MetricsToolInput, context: ToolContext): Promise<ToolResult> {
  const { sessionId } = context;
  const pool = await getPool();
  const request = pool.request();
  const result = await request.query<{
    metric: string;
    payload: string;
  }>(
    `DECLARE @TopWaits NVARCHAR(MAX);
     DECLARE @Blocking NVARCHAR(MAX);
     DECLARE @TopCpu NVARCHAR(MAX);
     DECLARE @Fragmentation NVARCHAR(MAX);
     DECLARE @HotTables NVARCHAR(MAX);

     SELECT @TopWaits = (
       SELECT TOP (10)
         wait_type,
         wait_time_ms,
         waiting_tasks_count,
         signal_wait_time_ms
       FROM sys.dm_os_wait_stats
       WHERE wait_type NOT LIKE 'SLEEP%'
       ORDER BY wait_time_ms DESC
       FOR JSON PATH
     );

     SELECT @Blocking = (
       SELECT TOP (10)
         wt.session_id,
         wt.blocking_session_id,
         wt.wait_type,
         wt.wait_duration_ms,
         wt.resource_description
       FROM sys.dm_os_waiting_tasks wt
       WHERE wt.blocking_session_id <> 0
       ORDER BY wt.wait_duration_ms DESC
       FOR JSON PATH
     );

     IF EXISTS (SELECT 1 FROM sys.database_query_store_options WHERE actual_state = 1)
     BEGIN
       SELECT @TopCpu = (
         SELECT TOP (10)
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
         ORDER BY rs.avg_cpu_time DESC
         FOR JSON PATH
       );
     END
     ELSE
     BEGIN
       SELECT @TopCpu = (
         SELECT TOP (10)
           SUBSTRING(st.text, (qs.statement_start_offset/2)+1,
             CASE WHEN qs.statement_end_offset = -1 THEN LEN(CONVERT(nvarchar(max), st.text))
             ELSE (qs.statement_end_offset - qs.statement_start_offset)/2 + 1 END) AS query_sql_text,
           qs.total_worker_time/qs.execution_count AS avg_cpu_time,
           qs.total_elapsed_time/qs.execution_count AS avg_duration,
           qs.execution_count AS count_executions
         FROM sys.dm_exec_query_stats qs
         CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) st
         ORDER BY qs.total_worker_time DESC
         FOR JSON PATH
       );
     END

     SELECT @Fragmentation = (
       SELECT TOP (10)
         OBJECT_SCHEMA_NAME(object_id) AS schema_name,
         OBJECT_NAME(object_id) AS object_name,
         index_id,
         avg_fragmentation_in_percent,
         page_count
       FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'SAMPLED')
       WHERE page_count > 1000
       ORDER BY avg_fragmentation_in_percent DESC
       FOR JSON PATH
     );

     SELECT @HotTables = (
       SELECT TOP (10)
         OBJECT_SCHEMA_NAME(p.object_id) AS schema_name,
         OBJECT_NAME(p.object_id) AS object_name,
         SUM(ps.used_page_count) / 128.0 AS used_mb
       FROM sys.dm_db_partition_stats ps
       INNER JOIN sys.partitions p ON ps.partition_id = p.partition_id
       GROUP BY OBJECT_SCHEMA_NAME(p.object_id), OBJECT_NAME(p.object_id)
       ORDER BY SUM(ps.used_page_count) DESC
       FOR JSON PATH
     );

     SELECT 'topWaits' AS metric, ISNULL(@TopWaits, '[]') AS payload
     UNION ALL
     SELECT 'blocking', ISNULL(@Blocking, '[]')
     UNION ALL
     SELECT 'topCpu', ISNULL(@TopCpu, '[]')
     UNION ALL
     SELECT 'fragmentation', ISNULL(@Fragmentation, '[]')
     UNION ALL
     SELECT 'hotTables', ISNULL(@HotTables, '[]');`
  );
  await appendExecution(sessionId, 'sql', {
    sqlText: 'METRICS_OVERVIEW',
    resultJson: JSON.stringify({ rows: result.recordset.length }),
    succeeded: true
  });
  const payload: Record<string, unknown> = {};
  for (const row of result.recordset) {
    payload[row.metric] = JSON.parse(row.payload);
  }
  return { ok: true, data: payload };
}
