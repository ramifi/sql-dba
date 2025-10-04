import 'server-only';
import { getPool, sql } from '@/lib/db/mssql';
import { appendExecution } from '@/lib/ai/agent/store';
import type { ToolContext, ToolResult } from './types';

export type QueryStoreToolInput =
  | { operation: 'queryById'; queryId: number }
  | { operation: 'queryByHash'; queryHash: string }
  | { operation: 'topRegressed'; top?: number };

export async function runQueryStoreTool(input: QueryStoreToolInput, context: ToolContext): Promise<ToolResult> {
  const { sessionId } = context;
  const pool = await getPool();
  const request = pool.request();
  let sqlText: string;
  switch (input.operation) {
    case 'queryById': {
      request.input('QueryId', sql.BigInt, input.queryId);
      sqlText = `SELECT qs.query_id,
                        qt.query_sql_text,
                        rs.avg_duration,
                        rs.avg_cpu_time,
                        rs.max_duration,
                        rs.count_executions,
                        qp.plan_id
                 FROM sys.query_store_query qs
                 INNER JOIN sys.query_store_query_text qt ON qs.query_text_id = qt.query_text_id
                 INNER JOIN sys.query_store_plan qp ON qs.query_id = qp.query_id
                 INNER JOIN sys.query_store_runtime_stats rs ON qp.plan_id = rs.plan_id
                 WHERE qs.query_id = @QueryId
                 ORDER BY rs.last_execution_time DESC`;
      break;
    }
    case 'queryByHash': {
      request.input('QueryHash', sql.VarBinary(8), Buffer.from(input.queryHash, 'hex'));
      sqlText = `SELECT TOP (20)
                        qs.query_id,
                        qt.query_sql_text,
                        rs.avg_duration,
                        rs.avg_cpu_time,
                        rs.count_executions
                 FROM sys.query_store_query qs
                 INNER JOIN sys.query_store_query_text qt ON qs.query_text_id = qt.query_text_id
                 INNER JOIN sys.query_store_plan qp ON qs.query_id = qp.query_id
                 INNER JOIN sys.query_store_runtime_stats rs ON qp.plan_id = rs.plan_id
                 WHERE qs.query_hash = @QueryHash
                 ORDER BY rs.avg_duration DESC`;
      break;
    }
    case 'topRegressed': {
      request.input('Top', sql.Int, input.top ?? 10);
      sqlText = `SELECT TOP (@Top)
                        qs.query_id,
                        qt.query_sql_text,
                        rs.avg_duration,
                        rs.avg_cpu_time,
                        rs.stdev_duration,
                        rs.count_executions
                 FROM sys.query_store_query qs
                 INNER JOIN sys.query_store_query_text qt ON qs.query_text_id = qt.query_text_id
                 INNER JOIN sys.query_store_plan qp ON qs.query_id = qp.query_id
                 INNER JOIN sys.query_store_runtime_stats rs ON qp.plan_id = rs.plan_id
                 ORDER BY rs.stdev_duration DESC`;
      break;
    }
    default:
      return { ok: false, error: `Unsupported QueryStore operation: ${(input as { operation: string }).operation}` };
  }
  const result = await request.query(sqlText);
  await appendExecution(sessionId, 'sql', {
    sqlText,
    resultJson: JSON.stringify({ rows: result.recordset.length }),
    succeeded: true
  });
  return { ok: true, data: result.recordset };
}
