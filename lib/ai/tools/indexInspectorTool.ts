import 'server-only';
import { getPool, sql } from '@/lib/db/mssql';
import { appendExecution } from '@/lib/ai/agent/store';
import type { ToolContext, ToolResult } from './types';

export type IndexInspectorInput = {
  schemaName: string;
  tableName: string;
};

export async function runIndexInspectorTool(input: IndexInspectorInput, context: ToolContext): Promise<ToolResult> {
  const { sessionId } = context;
  const pool = await getPool();
  const request = pool.request();
  request.input('SchemaName', sql.NVarChar(128), input.schemaName);
  request.input('TableName', sql.NVarChar(256), input.tableName);
  const sqlText = `WITH index_cols AS (
      SELECT i.object_id,
             i.name AS index_name,
             i.index_id,
             col.name AS column_name,
             ic.key_ordinal,
             ic.is_included_column,
             ic.is_descending_key
      FROM sys.indexes i
      INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
      INNER JOIN sys.columns col ON ic.object_id = col.object_id AND ic.column_id = col.column_id
      WHERE OBJECT_SCHEMA_NAME(i.object_id) = @SchemaName AND OBJECT_NAME(i.object_id) = @TableName
    )
    SELECT DISTINCT
      i.name AS index_name,
      i.type_desc,
      i.is_unique,
      i.fill_factor,
      us.user_seeks,
      us.user_scans,
      us.user_lookups,
      us.user_updates,
      STRING_AGG(CASE WHEN ic.is_included_column = 0 THEN ic.column_name + CASE WHEN ic.is_descending_key = 1 THEN ' DESC' ELSE '' END END, ', ')
        WITHIN GROUP (ORDER BY ic.key_ordinal) AS key_columns,
      STRING_AGG(CASE WHEN ic.is_included_column = 1 THEN ic.column_name END, ', ') AS include_columns
    FROM sys.indexes i
    INNER JOIN index_cols ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
    LEFT JOIN sys.dm_db_index_usage_stats us ON us.object_id = i.object_id AND us.index_id = i.index_id AND us.database_id = DB_ID()
    WHERE OBJECT_SCHEMA_NAME(i.object_id) = @SchemaName AND OBJECT_NAME(i.object_id) = @TableName
    GROUP BY i.name, i.type_desc, i.is_unique, i.fill_factor, us.user_seeks, us.user_scans, us.user_lookups, us.user_updates`;
  const result = await request.query(sqlText);
  await appendExecution(sessionId, 'sql', {
    sqlText,
    resultJson: JSON.stringify({ rows: result.recordset.length }),
    succeeded: true
  });
  return { ok: true, data: result.recordset };
}
