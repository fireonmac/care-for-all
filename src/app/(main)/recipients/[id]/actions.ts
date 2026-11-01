'use server';

import { after } from 'next/server';
import { db } from '@/db';
import { writeTransaction } from '@/db/transaction';
import { records, recipients } from '@/db/schema';
import { eq, and, gte, lt, desc, inArray } from 'drizzle-orm';
import { generateDailyRecord, generateWeeklyRecord } from '@/lib/ai';
import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { getKSTDateStr, addCalendarDays } from '@/lib/dateUtils';
import { dailyRecordDraftSchema } from '@/lib/daily-record';
import { AccessDeniedError, requireActor, requireRecipient, recipientAccess, recordAccess, recordFields } from '@/lib/workspace-access';
import { validateAiInput, DAILY_INPUT_LIMIT, WEEKLY_INPUT_LIMIT } from '@/lib/ai/input';

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) {
    throw new Error('올바른 날짜를 입력해주세요.');
  }
  return value;
}
function validWeeklyContent(content: string) {
  if (typeof content !== 'string' || !content.trim() || content.length > 5000) throw new Error('주간 기록은 1자 이상 5000자 이내로 입력해주세요.');
  return content.trim();
}
async function insertRecord(actorId: string, values: typeof records.$inferInsert) {
  // 권한 조회와 쓰기를 같은 트랜잭션에 둬 공유 철회와의 경합을 막는다.
  await writeTransaction(async (tx) => {
    const allowed = await tx.select({ id: recipients.id }).from(recipients)
      .where(and(eq(recipients.id, values.recipientId), recipientAccess(actorId, 'edit'))).get();
    if (!allowed) throw new AccessDeniedError();
    await tx.insert(records).values({ ...values, createdByUserId: actorId });
  });
}

export async function generateDraft(keywords: string, recipientId: string) {
  const actor = await requireActor();
  await requireRecipient(actor.id, recipientId, 'edit');
  validateAiInput(keywords, DAILY_INPUT_LIMIT);
  return generateDailyRecord(keywords);
}

export async function saveDailyRecord(recipientId: string, cognition: string, behavior: string, targetDate?: string) {
  const actor = await requireActor();
  const draft = dailyRecordDraftSchema.parse({ cognition, behavior });
  await insertRecord(actor.id, { id: randomUUID(), recipientId, date: validDate(targetDate || getKSTDateStr(new Date())),
    type: 'daily', cognitionContent: draft.cognition, behaviorContent: draft.behavior, createdAt: new Date() });
  revalidatePath(`/recipients/${recipientId}`);
  return { success: true };
}

export async function generateWeeklyDraft(recipientId: string) {
  const actor = await requireActor();
  await requireRecipient(actor.id, recipientId, 'edit');
  const daily = await db.select().from(records).where(and(eq(records.recipientId, recipientId),
    eq(records.type, 'daily'), recordAccess(actor.id))).orderBy(desc(records.date)).limit(7);
  const input = daily.map(r => ({ date: r.date, cognition: r.cognitionContent, behavior: r.behaviorContent }));
  if (!input.length) throw new Error('일일 기록이 필요합니다.');
  validateAiInput(JSON.stringify(input), WEEKLY_INPUT_LIMIT);
  return generateWeeklyRecord(input);
}

export async function saveWeeklyReport(recipientId: string, content: string) {
  const actor = await requireActor();
  await insertRecord(actor.id, { id: randomUUID(), recipientId, date: getKSTDateStr(new Date()), type: 'weekly',
    combinedContent: validWeeklyContent(content), createdAt: new Date() });
  revalidatePath(`/recipients/${recipientId}`);
  return { success: true };
}

export async function updateDailyRecord(recordId: string, cognition: string, behavior: string) {
  const actor = await requireActor();
  const draft = dailyRecordDraftSchema.parse({ cognition, behavior });
  const changed = await writeTransaction(async tx => tx.update(records).set({ cognitionContent: draft.cognition, behaviorContent: draft.behavior })
    .where(and(eq(records.id, recordId), eq(records.type, 'daily'), recordAccess(actor.id, 'edit')))
    .returning({ recipientId: records.recipientId }));
  if (!changed.length) throw new AccessDeniedError();
  revalidatePath(`/recipients/${changed[0].recipientId}`);
}

export async function updateWeeklyRecord(recordId: string, content: string) {
  const actor = await requireActor();
  const changed = await writeTransaction(async tx => tx.update(records).set({ combinedContent: validWeeklyContent(content) })
    .where(and(eq(records.id, recordId), eq(records.type, 'weekly'), recordAccess(actor.id, 'edit')))
    .returning({ recipientId: records.recipientId }));
  if (!changed.length) throw new AccessDeniedError();
  revalidatePath(`/recipients/${changed[0].recipientId}`);
}

export async function deleteRecord(recordId: string) {
  const actor = await requireActor();
  const removed = await writeTransaction(async tx => tx.delete(records).where(and(eq(records.id, recordId), recordAccess(actor.id, 'edit')))
    .returning({ recipientId: records.recipientId }));
  if (!removed.length) throw new AccessDeniedError();
  revalidatePath(`/recipients/${removed[0].recipientId}`);
}

export async function getWeeklyRecord(recordId: string) {
  const actor = await requireActor();
  const record = await db.select(recordFields(actor.id)).from(records)
    .where(and(eq(records.id, recordId), eq(records.type, 'weekly'), recordAccess(actor.id))).get();
  if (!record) throw new AccessDeniedError();
  return { id: record.id, status: record.status, combinedContent: record.combinedContent, canEdit: record.canEdit };
}

export async function getInitialWeeklyReportStatus(recipientId: string, targetDate: string) {
  const actor = await requireActor();
  await requireRecipient(actor.id, recipientId);
  const existing = await db.select(recordFields(actor.id)).from(records).where(and(eq(records.recipientId, recipientId),
    eq(records.type, 'weekly'), eq(records.date, validDate(targetDate)), recordAccess(actor.id))).get();
  return { recordId: existing?.id, status: existing?.status, canEdit: existing?.canEdit ?? false };
}

async function processWeeklyReport(recordId: string, recipientId: string, targetDate: string, actorId: string) {
  try {
    await requireRecipient(actorId, recipientId, 'edit');
    const daily = await db.select().from(records).where(and(eq(records.recipientId, recipientId), eq(records.type, 'daily'),
      gte(records.date, targetDate), lt(records.date, addCalendarDays(targetDate, 7)), recordAccess(actorId)));
    if (!daily.length) throw new Error('일일 기록이 필요합니다.');
    const input = daily.map(r => ({ date: r.date, cognition: r.cognitionContent, behavior: r.behaviorContent }));
    validateAiInput(JSON.stringify(input), WEEKLY_INPUT_LIMIT);
    // 대기 중 철회된 공유 권한은 입력 조회와 최종 저장 모두에서 다시 검사한다.
    await requireRecipient(actorId, recipientId, 'edit');
    const finalContent = await generateWeeklyRecord(input);
    const saved = await writeTransaction(async tx => tx.update(records).set({ status: 'COMPLETED', combinedContent: finalContent })
      .where(and(eq(records.id, recordId), eq(records.status, 'PROCESSING'),
        inArray(records.recipientId, db.select({ id: recipients.id }).from(recipients).where(recipientAccess(actorId, 'edit')))))
      .returning({ id: records.id }));
    if (!saved.length) throw new AccessDeniedError();
  } catch {
    // 작업자가 방금 만든 레코드 상태만 닫는다. 원문/모델 응답/개인정보는 로그에 남기지 않는다.
    await writeTransaction(async tx => tx.update(records).set({ status: 'FAILED' }).where(and(eq(records.id, recordId),
      eq(records.createdByUserId, actorId), eq(records.status, 'PROCESSING'))));
  }
}

export async function generateWeeklyReportBackground(recipientId: string, targetDate: string) {
  const actor = await requireActor();
  validDate(targetDate);
  await requireRecipient(actor.id, recipientId, 'edit');
  const existing = await db.select().from(records).where(and(eq(records.recipientId, recipientId),
    eq(records.type, 'weekly'), eq(records.date, targetDate), recordAccess(actor.id))).get();
  if (existing && existing.status !== 'FAILED') return { recordId: existing.id, status: existing.status };
  const recordId = randomUUID();
  await insertRecord(actor.id, { id: recordId, recipientId, date: targetDate, type: 'weekly', status: 'PROCESSING', createdAt: new Date() });
  if (existing) await writeTransaction(async tx => tx.delete(records).where(and(eq(records.id, existing.id), eq(records.status, 'FAILED'), recordAccess(actor.id, 'edit'))));
  after(() => processWeeklyReport(recordId, recipientId, targetDate, actor.id));
  return { recordId, status: 'PROCESSING' as const };
}
