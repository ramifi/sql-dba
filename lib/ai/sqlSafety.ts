import 'server-only';

const forbidden = [
  'create',
  'alter',
  'drop',
  'truncate',
  'insert',
  'update',
  'delete',
  'merge',
  'grant',
  'revoke',
  'enable',
  'disable',
  'attach',
  'detach'
];

export function assertReadOnly(sqlText: string): void {
  const normalized = sqlText.replace(/\s+/g, ' ').trim().toLowerCase();
  if (!normalized.startsWith('select') && !normalized.startsWith('with') && !normalized.startsWith('dbcc')) {
    throw new Error('Only read-only SQL statements are permitted.');
  }
  for (const keyword of forbidden) {
    if (normalized.includes(`${keyword} `) || normalized.includes(`${keyword}\n`)) {
      throw new Error(`Unsafe SQL keyword detected: ${keyword}`);
    }
  }
}

export function clampRows<T>(rows: T[], max = 2000): T[] {
  if (rows.length <= max) {
    return rows;
  }
  return rows.slice(0, max);
}
