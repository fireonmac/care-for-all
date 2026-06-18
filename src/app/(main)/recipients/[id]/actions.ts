'use server';

import { after } from 'next/server';

import { db } from '@/db';
import { records } from '@/db/schema';
import { eq, and, gte, lt } from 'drizzle-orm';
import { generateDailyRecord, generateWeeklyRecord } from '@/lib/ai';
import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { getKSTDateStr } from '@/lib/dateUtils';
import { getRecipientRecords } from './queries';
import { getSession } from '@/lib/auth';

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function generateDraft(keywords: string) {
  const session = await getSession();
  if (!session) throw new Error('로그인이 필요합니다.');
  return await generateDailyRecord(keywords);
}

export async function saveDailyRecord(recipientId: string, cognition: string, behavior: string, targetDate?: string) {
  const session = await getSession();
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
  const session = await getSession();
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
  const session = await getSession();
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
  const session = await getSession();
  if (!session) throw new Error('로그인이 필요합니다.');
  await db.update(records).set({
    cognitionContent: cognition,
    behaviorContent: behavior
  }).where(eq(records.id, recordId));
  
  const record = await db.select().from(records).where(eq(records.id, recordId));
  if(record.length > 0) revalidatePath(`/recipients/${record[0].recipientId}`);
}

export async function updateWeeklyRecord(recordId: string, content: string) {
  const session = await getSession();
  if (!session) throw new Error('로그인이 필요합니다.');
  await db.update(records).set({
    combinedContent: content
  }).where(eq(records.id, recordId));
  
  const recordList = await db.select().from(records).where(eq(records.id, recordId));
  if(recordList.length > 0) revalidatePath(`/recipients/${recordList[0].recipientId}`);
}

export async function deleteRecord(recordId: string) {
  const session = await getSession();
  if (!session) throw new Error('로그인이 필요합니다.');
  const recordList = await db.select().from(records).where(eq(records.id, recordId));
  if(recordList.length > 0) {
    await db.delete(records).where(eq(records.id, recordId));
    revalidatePath(`/recipients/${recordList[0].recipientId}`);
  }
}

// ===============================
// Weekly Report Server Actions 
// ===============================

export async function getWeeklyRecord(recordId: string) {
  const session = await getSession();
  if (!session) throw new Error('로그인이 필요합니다.');

  const record = await db.select().from(records).where(eq(records.id, recordId)).get();
  if (!record) throw new Error('Record not found');

  return {
    id: record.id,
    status: record.status,
    combinedContent: record.combinedContent,
  };
}

export async function getInitialWeeklyReportStatus(recipientId: string, targetDate: string) {
  const session = await getSession();
  if (!session) throw new Error('로그인이 필요합니다.');

  const existingRecord = await db.select().from(records)
    .where(
      and(
        eq(records.recipientId, recipientId),
        eq(records.type, 'weekly'),
        eq(records.date, targetDate)
      )
    ).get();

  if (existingRecord) {
    return { recordId: existingRecord.id, status: existingRecord.status };
  }
  return { recordId: undefined, status: undefined }; // 'IDLE' state inferred when both are undefined
}

// 비동기 백그라운드 작업 (내부용)
async function processWeeklyReport(recordId: string, recipientId: string, targetDate: string) {
  try {
    const startDate = new Date(targetDate);
    const endDate = new Date(startDate.getTime() + ONE_WEEK_MS);
    
    const startDateStr = getKSTDateStr(startDate);
    const endDateStr = getKSTDateStr(endDate);

    const weeklyData = await db.select()
      .from(records)
      .where(
        and(
          eq(records.recipientId, recipientId),
          eq(records.type, 'daily'),
          gte(records.date, startDateStr),
          lt(records.date, endDateStr)
        )
      ).all();

    if (weeklyData.length === 0) {
      await db.update(records).set({ status: 'FAILED' }).where(eq(records.id, recordId)).run();
      return;
    }

    const finalContent = await generateWeeklyRecord(
      weeklyData.map((record) => ({
        date: record.date,
        cognition: record.cognitionContent,
        behavior: record.behaviorContent,
      }))
    );

    await db.update(records)
      .set({ 
        status: 'COMPLETED',
        combinedContent: finalContent 
      })
      .where(eq(records.id, recordId))
      .run();

  } catch (error) {
    console.error('주간 리포트 백그라운드 작업 실패:', error);
    await db.update(records).set({ status: 'FAILED' }).where(eq(records.id, recordId)).run();
  }
}

export async function generateWeeklyReportBackground(recipientId: string, targetDate: string) {
  const session = await getSession();
  if (!session) throw new Error('로그인이 필요합니다.');

  const existingRecord = await db.select().from(records)
    .where(
      and(
        eq(records.recipientId, recipientId),
        eq(records.type, 'weekly'),
        eq(records.date, targetDate)
      )
    ).get();

  if (existingRecord) {
    if (existingRecord.status === 'PROCESSING') {
      return { recordId: existingRecord.id, status: existingRecord.status };
    } else if (existingRecord.status === 'COMPLETED') {
      return { recordId: existingRecord.id, status: existingRecord.status };
    } else {
      // FAILED 인 경우 재시도를 위해 일괄 삭제
      await db.delete(records).where(
        and(
          eq(records.recipientId, recipientId),
          eq(records.type, 'weekly'),
          eq(records.date, targetDate),
          eq(records.status, 'FAILED')
        )
      ).run();
    }
  }

  const recordId = randomUUID();
  await db.insert(records).values({
    id: recordId,
    recipientId,
    date: targetDate,
    type: 'weekly',
    status: 'PROCESSING',
    createdAt: new Date(),
  }).run();

  // Safe background execution after response
  after(() => {
    processWeeklyReport(recordId, recipientId, targetDate);
  });

  return { recordId, status: 'PROCESSING' as const };
}
