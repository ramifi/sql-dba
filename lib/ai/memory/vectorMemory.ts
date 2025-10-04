import 'server-only';
import { getPool, sql } from '@/lib/db/mssql';

export type MemoryRecord = {
  id: number;
  issueType: string;
  summary: string;
  similarity: number;
};

function bufferToVector(buffer: Buffer): Float32Array {
  return new Float32Array(buffer.buffer, buffer.byteOffset, buffer.length / 4);
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    return 0;
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const av = a[i];
    const bv = b[i];
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  if (normA === 0 || normB === 0) {
    return 0;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function getSimilarMemories(issueType: string, embedding: number[], topK = 5): Promise<MemoryRecord[]> {
  const pool = await getPool();
  const request = pool.request();
  request.input('IssueType', sql.NVarChar(100), issueType);
  const result = await request.query<{ Id: number; IssueType: string; Summary: string; Embedding: Buffer }>(
    `SELECT TOP (100) Id, IssueType, Summary, Embedding
     FROM dbo.DbaMemory WITH (NOLOCK)
     WHERE IssueType = @IssueType
     ORDER BY CreatedAt DESC`
  );
  const targetVector = new Float32Array(embedding);
  const scored = result.recordset.map((row) => {
    const vector = bufferToVector(row.Embedding);
    return {
      id: row.Id,
      issueType: row.IssueType,
      summary: row.Summary,
      similarity: cosineSimilarity(targetVector, vector)
    } satisfies MemoryRecord;
  });
  return scored
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

function vectorToBuffer(vector: number[]): Buffer {
  const array = new Float32Array(vector);
  return Buffer.from(array.buffer);
}

export async function insertMemory(issueType: string, summary: string, embedding: number[]): Promise<void> {
  const pool = await getPool();
  const request = pool.request();
  request.input('IssueType', sql.NVarChar(100), issueType);
  request.input('Summary', sql.NVarChar(sql.MAX), summary);
  request.input('Embedding', sql.VarBinary(sql.MAX), vectorToBuffer(embedding));
  await request.query(
    `INSERT INTO dbo.DbaMemory (IssueType, Summary, Embedding)
     VALUES (@IssueType, @Summary, @Embedding)`
  );
}
