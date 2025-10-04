import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getPool, sql } from '@/lib/db/mssql';
import { assertReadOnly, clampRows } from '@/lib/ai/sqlSafety';
import { appendExecution } from '@/lib/ai/agent/store';

const ParamSchema = z.object({
  name: z.string(),
  type: z.enum(['NVarChar', 'Int', 'BigInt', 'UniqueIdentifier', 'DateTime2']),
  value: z.unknown()
});

const RequestSchema = z.object({
  sessionId: z.string().uuid(),
  sql: z.string(),
  params: z.array(ParamSchema).optional()
});

const typeMap = {
  NVarChar: sql.NVarChar(sql.MAX),
  Int: sql.Int,
  BigInt: sql.BigInt,
  UniqueIdentifier: sql.UniqueIdentifier,
  DateTime2: sql.DateTime2
} as const;

type TypeKey = keyof typeof typeMap;

export async function POST(request: Request) {
  const start = Date.now();
  let status = 200;
  try {
    const body = await request.json();
    const parsed = RequestSchema.parse(body);
    assertReadOnly(parsed.sql);
    const pool = await getPool();
    const req = pool.request();
    for (const param of parsed.params ?? []) {
      const type = typeMap[param.type as TypeKey];
      req.input(param.name, type, param.value as never);
    }
    const result = await req.query(parsed.sql);
    const rows = clampRows(result.recordset ?? []);
    await appendExecution(parsed.sessionId, 'sql', {
      sqlText: parsed.sql,
      resultJson: JSON.stringify({ rows: rows.length }),
      succeeded: true
    });
    return NextResponse.json({ rows, rowCount: rows.length });
  } catch (error) {
    status = 500;
    return NextResponse.json({ error: (error as Error).message }, { status });
  } finally {
    const duration = Date.now() - start;
    console.log(`[sql.exec] POST ${status} ${duration}ms`);
  }
}
