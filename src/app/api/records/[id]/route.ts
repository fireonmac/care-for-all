import { NextRequest } from 'next/server';
import { db } from '@/db';
import { records } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const recordId = resolvedParams.id;

    if (!recordId) {
      return new Response(JSON.stringify({ error: 'recordId is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const record = await db.select().from(records).where(eq(records.id, recordId)).get();

    if (!record) {
      return new Response(JSON.stringify({ error: 'Record not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({
      id: record.id,
      status: record.status,
      combinedContent: record.combinedContent,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Record Fetch Error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
