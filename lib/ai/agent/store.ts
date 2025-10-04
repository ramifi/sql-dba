import 'server-only';
import { randomUUID } from 'crypto';
import { getPool, sql } from '@/lib/db/mssql';

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export type StoredMessage = {
  role: MessageRole;
  content: string;
  toolName?: string | null;
  createdAt: string;
};

export type StoredExecution = {
  id: number;
  sessionId: string;
  kind: string;
  sqlText: string | null;
  resultJson: string | null;
  startedAt: string;
  finishedAt: string | null;
  succeeded: boolean | null;
  error: string | null;
};

const schemaSql = `
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='DbaSessions') CREATE TABLE dbo.DbaSessions(
  SessionId UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
  Title NVARCHAR(200) NOT NULL,
  IssueType NVARCHAR(100) NOT NULL,
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  Status NVARCHAR(30) NOT NULL DEFAULT 'active'
);
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='DbaMessages') CREATE TABLE dbo.DbaMessages(
  Id BIGINT IDENTITY PRIMARY KEY,
  SessionId UNIQUEIDENTIFIER NOT NULL,
  Role NVARCHAR(20) NOT NULL,
  Content NVARCHAR(MAX) NOT NULL,
  ToolName NVARCHAR(100) NULL,
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='DbaExecutions') CREATE TABLE dbo.DbaExecutions(
  Id BIGINT IDENTITY PRIMARY KEY,
  SessionId UNIQUEIDENTIFIER NOT NULL,
  Kind NVARCHAR(30) NOT NULL,
  SqlText NVARCHAR(MAX) NULL,
  ResultJson NVARCHAR(MAX) NULL,
  StartedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  FinishedAt DATETIME2 NULL,
  Succeeded BIT NULL,
  Error NVARCHAR(MAX) NULL
);
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='DbaSettings') CREATE TABLE dbo.DbaSettings(
  Id INT IDENTITY PRIMARY KEY,
  Name NVARCHAR(100) UNIQUE NOT NULL,
  Value NVARCHAR(MAX) NOT NULL
);
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='DbaMemory') CREATE TABLE dbo.DbaMemory(
  Id BIGINT IDENTITY PRIMARY KEY,
  IssueType NVARCHAR(100) NOT NULL,
  Summary NVARCHAR(MAX) NOT NULL,
  Embedding VARBINARY(MAX) NOT NULL,
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
`;

export async function ensureSchema(): Promise<void> {
  const pool = await getPool();
  await pool.request().batch(schemaSql);
}

export async function createSession(issueType: string, title: string): Promise<string> {
  const pool = await getPool();
  const sessionId = randomUUID();
  const request = pool.request();
  request.input('SessionId', sql.UniqueIdentifier, sessionId);
  request.input('Title', sql.NVarChar(200), title);
  request.input('IssueType', sql.NVarChar(100), issueType);
  await request.query(
    `INSERT INTO dbo.DbaSessions (SessionId, Title, IssueType)
     VALUES (@SessionId, @Title, @IssueType)`
  );
  return sessionId;
}

export async function appendMessage(
  sessionId: string,
  role: MessageRole,
  content: string,
  toolName?: string
): Promise<void> {
  const pool = await getPool();
  const request = pool.request();
  request.input('SessionId', sql.UniqueIdentifier, sessionId);
  request.input('Role', sql.NVarChar(20), role);
  request.input('Content', sql.NVarChar(sql.MAX), content);
  request.input('ToolName', sql.NVarChar(100), toolName ?? null);
  await request.query(
    `INSERT INTO dbo.DbaMessages (SessionId, Role, Content, ToolName)
     VALUES (@SessionId, @Role, @Content, @ToolName)`
  );
}

export async function listMessages(sessionId: string): Promise<StoredMessage[]> {
  const pool = await getPool();
  const request = pool.request();
  request.input('SessionId', sql.UniqueIdentifier, sessionId);
  const result = await request.query<{
    Role: MessageRole;
    Content: string;
    ToolName: string | null;
    CreatedAt: Date;
  }>(
    `SELECT Role, Content, ToolName, CreatedAt
     FROM dbo.DbaMessages WITH (NOLOCK)
     WHERE SessionId = @SessionId
     ORDER BY CreatedAt ASC`
  );
  return result.recordset.map((row) => ({
    role: row.Role,
    content: row.Content,
    toolName: row.ToolName,
    createdAt: row.CreatedAt.toISOString()
  }));
}

export async function appendExecution(
  sessionId: string,
  kind: string,
  data: { sqlText?: string | null; resultJson?: string | null; succeeded?: boolean | null; error?: string | null }
): Promise<number> {
  const pool = await getPool();
  const request = pool.request();
  request.input('SessionId', sql.UniqueIdentifier, sessionId);
  request.input('Kind', sql.NVarChar(30), kind);
  request.input('SqlText', sql.NVarChar(sql.MAX), data.sqlText ?? null);
  request.input('ResultJson', sql.NVarChar(sql.MAX), data.resultJson ?? null);
  request.input('Succeeded', sql.Bit, data.succeeded ?? null);
  request.input('Error', sql.NVarChar(sql.MAX), data.error ?? null);
  const result = await request.query<{ Id: number }>(
    `INSERT INTO dbo.DbaExecutions (SessionId, Kind, SqlText, ResultJson, Succeeded, Error)
     OUTPUT INSERTED.Id
     VALUES (@SessionId, @Kind, @SqlText, @ResultJson, @Succeeded, @Error)`
  );
  return result.recordset[0]?.Id ?? 0;
}

export async function listExecutions(sessionId: string): Promise<StoredExecution[]> {
  const pool = await getPool();
  const request = pool.request();
  request.input('SessionId', sql.UniqueIdentifier, sessionId);
  const result = await request.query<{
    Id: number;
    SessionId: string;
    Kind: string;
    SqlText: string | null;
    ResultJson: string | null;
    StartedAt: Date;
    FinishedAt: Date | null;
    Succeeded: boolean | null;
    Error: string | null;
  }>(
    `SELECT Id, SessionId, Kind, SqlText, ResultJson, StartedAt, FinishedAt, Succeeded, Error
     FROM dbo.DbaExecutions WITH (NOLOCK)
     WHERE SessionId = @SessionId
     ORDER BY StartedAt DESC`
  );
  return result.recordset.map((row) => ({
    id: row.Id,
    sessionId: row.SessionId,
    kind: row.Kind,
    sqlText: row.SqlText,
    resultJson: row.ResultJson,
    startedAt: row.StartedAt.toISOString(),
    finishedAt: row.FinishedAt ? row.FinishedAt.toISOString() : null,
    succeeded: row.Succeeded,
    error: row.Error
  }));
}

export async function getSetting(name: string): Promise<string | null> {
  const pool = await getPool();
  const request = pool.request();
  request.input('Name', sql.NVarChar(100), name);
  const result = await request.query<{ Value: string }>(
    `SELECT Value FROM dbo.DbaSettings WITH (NOLOCK) WHERE Name = @Name`
  );
  return result.recordset[0]?.Value ?? null;
}

export async function setSetting(name: string, value: string): Promise<void> {
  const pool = await getPool();
  const request = pool.request();
  request.input('Name', sql.NVarChar(100), name);
  request.input('Value', sql.NVarChar(sql.MAX), value);
  await request.query(
    `MERGE dbo.DbaSettings AS target
     USING (SELECT @Name AS Name) AS source
     ON target.Name = source.Name
     WHEN MATCHED THEN UPDATE SET Value = @Value
     WHEN NOT MATCHED THEN INSERT (Name, Value) VALUES (@Name, @Value);`
  );
}
