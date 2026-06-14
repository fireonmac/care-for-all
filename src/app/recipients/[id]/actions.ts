'use server';

import { db } from '@/db';
import { records, recipients } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { formatKeywordsWithAI, formatWeeklyReportWithAI } from '@/lib/ai';
import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';

export async function getRecipientOr404(id: string) {
  const result = await db.select().from(recipients).where(eq(recipients.id, id));
  if (result.length === 0) {
    notFound();
  }
  return result[0];
}

export async function getRecipientRecords(recipientId: string) {
  return await db.select()
    .from(records)
    .where(eq(records.recipientId, recipientId))
    .orderBy(desc(records.date));
}

export async function generateDraft(keywords: string) {
  return await formatKeywordsWithAI(keywords);
}

export async function saveDailyRecord(recipientId: string, cognition: string, behavior: string, targetDate?: string) {
  const dateStr = targetDate || new Date().toISOString().split('T')[0];
  
  await db.insert(records).values({
    id: randomUUID(),
    recipientId,
    date: dateStr,
    type: 'daily',
    cognitionContent: cognition,
    behaviorContent: behavior,
    createdAt: new Date(),
  });
  
  revalidatePath(`/recipients/${recipientId}`);
  return { success: true };
}

export async function generateWeeklyDraft(recipientId: string) {
  const allRecords = await getRecipientRecords(recipientId);
  const dailyRecords = allRecords.filter(r => r.type === 'daily').slice(0, 7);

  const formattedForAI = dailyRecords.map(r => ({
    date: r.date,
    cognition: r.cognitionContent,
    behavior: r.behaviorContent
  }));

  return await formatWeeklyReportWithAI(formattedForAI);
}

export async function saveWeeklyReport(recipientId: string, content: string) {
  const todayStr = new Date().toISOString().split('T')[0];
  
  await db.insert(records).values({
    id: randomUUID(),
    recipientId,
    date: todayStr,
    type: 'weekly',
    combinedContent: content,
    createdAt: new Date(),
  });
  
  revalidatePath(`/recipients/${recipientId}`);
  return { success: true };
}

export async function updateDailyRecord(recordId: string, cognition: string, behavior: string) {
  await db.update(records).set({
    cognitionContent: cognition,
    behaviorContent: behavior
  }).where(eq(records.id, recordId));
  
  const record = await db.select().from(records).where(eq(records.id, recordId));
  if(record.length > 0) revalidatePath(`/recipients/${record[0].recipientId}`);
}

export async function updateWeeklyRecord(recordId: string, content: string) {
  await db.update(records).set({
    combinedContent: content
  }).where(eq(records.id, recordId));
  
  const recordList = await db.select().from(records).where(eq(records.id, recordId));
  if(recordList.length > 0) revalidatePath(`/recipients/${recordList[0].recipientId}`);
}

export async function deleteRecord(recordId: string) {
  const recordList = await db.select().from(records).where(eq(records.id, recordId));
  if(recordList.length > 0) {
    await db.delete(records).where(eq(records.id, recordId));
    revalidatePath(`/recipients/${recordList[0].recipientId}`);
  }
}
