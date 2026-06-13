'use server';

import { db } from '@/db';
import { recipients } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';

export async function getRecipients() {
  return await db.select().from(recipients).orderBy(desc(recipients.createdAt));
}

export async function addRecipient(name: string) {
  if (!name.trim()) return { error: '이름을 입력해주세요.' };
  
  await db.insert(recipients).values({
    id: randomUUID(),
    name: name.trim(),
    createdAt: new Date(),
    isActive: true,
  });

  revalidatePath('/');
  return { success: true };
}

export async function getRecipientsWithStats() {
  const { records } = await import('@/db/schema');
  const allRecipients = await db.select().from(recipients).orderBy(desc(recipients.createdAt));
  const allRecords = await db.select().from(records).orderBy(desc(records.date));

  const todayStr = new Date().toISOString().split('T')[0];

  return allRecipients.map(recipient => {
    const recipientRecords = allRecords.filter(r => r.recipientId === recipient.id);
    const hasTodayRecord = recipientRecords.some(r => r.date === todayStr && r.type === 'daily');
    const latestRecord = recipientRecords.find(r => r.type === 'daily');

    return {
      ...recipient,
      hasTodayRecord,
      latestRecordDate: latestRecord ? latestRecord.date : null,
    };
  });
}
