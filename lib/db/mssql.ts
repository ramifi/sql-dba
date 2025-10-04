import 'server-only';
import { ConnectionPool, config as SqlConfig, IResult } from 'mssql';
import * as sql from 'mssql';

const poolCache: { pool: ConnectionPool | null } = { pool: null };

const config: SqlConfig = {
  server: process.env.MSSQL_SERVER ?? '',
  database: process.env.MSSQL_DATABASE ?? '',
  user: process.env.MSSQL_USER ?? '',
  password: process.env.MSSQL_PASSWORD ?? '',
  options: {
    encrypt: (process.env.MSSQL_ENCRYPT ?? 'true').toLowerCase() !== 'false',
    enableArithAbort: false
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

export type SqlParameter = {
  name: string;
  type: sql.ISqlType;
  value: unknown;
};

function assertConfig(): void {
  const missing: string[] = [];
  if (!config.server) missing.push('MSSQL_SERVER');
  if (!config.database) missing.push('MSSQL_DATABASE');
  if (!config.user) missing.push('MSSQL_USER');
  if (!config.password) missing.push('MSSQL_PASSWORD');
  if (missing.length) {
    throw new Error(`Missing MSSQL configuration env vars: ${missing.join(', ')}`);
  }
}

export async function getPool(): Promise<ConnectionPool> {
  if (poolCache.pool) {
    return poolCache.pool;
  }
  assertConfig();
  const pool = new ConnectionPool(config);
  poolCache.pool = pool;
  pool.on('error', (err) => {
    console.error('MSSQL pool error', err);
    poolCache.pool = null;
  });
  await pool.connect();
  return pool;
}

export async function query<T>(sqlText: string, params: SqlParameter[] = []): Promise<IResult<T>> {
  const pool = await getPool();
  const request = pool.request();
  for (const param of params) {
    request.input(param.name, param.type, param.value as never);
  }
  return request.query<T>(sqlText);
}

export { sql };
