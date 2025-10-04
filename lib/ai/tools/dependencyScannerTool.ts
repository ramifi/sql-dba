import 'server-only';
import { getPool, sql } from '@/lib/db/mssql';
import { appendExecution } from '@/lib/ai/agent/store';
import type { ToolContext, ToolResult } from './types';

export type DependencyScannerInput = {
  schemaName: string;
  tableName: string;
};

export async function runDependencyScannerTool(input: DependencyScannerInput, context: ToolContext): Promise<ToolResult> {
  const { sessionId } = context;
  const pool = await getPool();
  const request = pool.request();
  request.input('SchemaName', sql.NVarChar(128), input.schemaName);
  request.input('TableName', sql.NVarChar(256), input.tableName);
  const sqlText = `SELECT DISTINCT
      referencing_schema_name,
      referencing_entity_name,
      referencing_class_desc,
      is_caller_dependent
    FROM sys.sql_expression_dependencies
    WHERE referenced_schema_name = @SchemaName
      AND referenced_entity_name = @TableName`;
  const result = await request.query(sqlText);
  await appendExecution(sessionId, 'sql', {
    sqlText,
    resultJson: JSON.stringify({ rows: result.recordset.length }),
    succeeded: true
  });
  return { ok: true, data: result.recordset };
}
