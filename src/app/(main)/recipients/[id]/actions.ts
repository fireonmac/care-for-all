'use server';

import { db } from '@/db';
import { records } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { generateDailyRecord, generateWeeklyRecord } from '@/lib/ai';
import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { getKSTDateStr } from '@/lib/dateUtils';
import { getRecipientRecords } from './queries';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function generateDraft(keywords: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error('로그인이 필요합니다.');
  return await generateDailyRecord(keywords);
}

export async function saveDailyRecord(recipientId: string, cognition: string, behavior: string, targetDate?: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error('로그인이 필요합니다.');
  const dateStr = targetDate || getKSTDateStr(new Date());
  
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
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error('로그인이 필요합니다.');
  const allRecords = await getRecipientRecords(recipientId);
  const dailyRecords = allRecords.filter(r => r.type === 'daily').slice(0, 7);

  const formattedForAI = dailyRecords.map(r => ({
    date: r.date,
    cognition: r.cognitionContent,
    behavior: r.behaviorContent
  }));

  return await generateWeeklyRecord(formattedForAI);
}

export async function saveWeeklyReport(recipientId: string, content: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error('로그인이 필요합니다.');
  const todayStr = getKSTDateStr(new Date());
  
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
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error('로그인이 필요합니다.');
  await db.update(records).set({
    cognitionContent: cognition,
    behaviorContent: behavior
  }).where(eq(records.id, recordId));
  
  const record = await db.select().from(records).where(eq(records.id, recordId));
  if(record.length > 0) revalidatePath(`/recipients/${record[0].recipientId}`);
}

export async function updateWeeklyRecord(recordId: string, content: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error('로그인이 필요합니다.');
  await db.update(records).set({
    combinedContent: content
  }).where(eq(records.id, recordId));
  
  const recordList = await db.select().from(records).where(eq(records.id, recordId));
  if(recordList.length > 0) revalidatePath(`/recipients/${recordList[0].recipientId}`);
}

export async function deleteRecord(recordId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error('로그인이 필요합니다.');
  const recordList = await db.select().from(records).where(eq(records.id, recordId));
  if(recordList.length > 0) {
    await db.delete(records).where(eq(records.id, recordId));
    revalidatePath(`/recipients/${recordList[0].recipientId}`);
  }
}
