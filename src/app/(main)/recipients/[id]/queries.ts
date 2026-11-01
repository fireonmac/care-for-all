import { db } from '@/db';
import { requireSession } from '@/lib/auth';
import { records, recipients } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { notFound } from 'next/navigation';

export async function getRecipientOr404(id: string) {
  await requireSession();
  const result = await db.select().from(recipients).where(eq(recipients.id, id));
  if (result.length === 0) {
    notFound();
  }
  return result[0];
}

export async function getRecipientRecords(recipientId: string) {
  await requireSession();
  return await db
    .select()
    .from(records)
    .where(eq(records.recipientId, recipientId))
    .orderBy(desc(records.date));
}
