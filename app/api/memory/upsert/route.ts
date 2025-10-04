import { NextResponse } from 'next/server';
import { z } from 'zod';
import { insertMemory } from '@/lib/ai/memory/vectorMemory';
import { DEFAULT_EMBEDDING_MODEL, getOpenAI } from '@/lib/ai/openai';

const RequestSchema = z.object({
  issueType: z.string(),
  summary: z.string()
});

export async function POST(request: Request) {
  const start = Date.now();
  let status = 200;
  try {
    if (!process.env.OPENAI_API_KEY) {
      status = 503;
      return NextResponse.json({ error: 'Embeddings unavailable without OPENAI_API_KEY' }, { status });
    }
    const body = await request.json();
    const parsed = RequestSchema.parse(body);
    const openai = getOpenAI();
    const embedding = await openai.embeddings.create({
      model: DEFAULT_EMBEDDING_MODEL,
      input: parsed.summary
    });
    await insertMemory(parsed.issueType, parsed.summary, embedding.data[0]?.embedding ?? []);
    return NextResponse.json({ ok: true });
  } catch (error) {
    status = 500;
    return NextResponse.json({ error: (error as Error).message }, { status });
  } finally {
    const duration = Date.now() - start;
    console.log(`[memory.upsert] POST ${status} ${duration}ms`);
  }
}
