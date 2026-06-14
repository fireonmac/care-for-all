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
      return Response.json({ error: 'recordId is required' }, { status: 400 });
    }

    const record = db.select().from(records).where(eq(records.id, recordId)).get();

    if (!record) {
      return Response.json({ error: 'Record not found' }, { status: 404 });
    }

    return Response.json({
      id: record.id,
      status: record.status,
      combinedContent: record.combinedContent,
    });
  } catch (error) {
    console.error('Record Fetch Error:', error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
