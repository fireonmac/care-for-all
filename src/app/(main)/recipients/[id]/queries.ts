import { db } from '@/db';
import { records } from '@/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { AccessDeniedError, requireActor, requireRecipient, recordAccess, recordFields } from '@/lib/workspace-access';

export async function getRecipientOr404(id: string) {
  const actor = await requireActor();
  try { return await requireRecipient(actor.id, id); }
  catch (error) { if (error instanceof AccessDeniedError) notFound(); throw error; }
}

export async function getRecipientRecords(recipientId: string) {
  const actor = await requireActor();
  await requireRecipient(actor.id, recipientId);
  return db.select(recordFields(actor.id)).from(records)
    .where(and(eq(records.recipientId, recipientId), recordAccess(actor.id))).orderBy(desc(records.date));
}
