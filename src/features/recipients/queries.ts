import { db } from '@/db';
import { recipients, records } from '@/db/schema';
import { getWeekData, getKSTDateStr } from '@/lib/dateUtils';
import { desc, eq, and, gte, lte, ilike, max } from 'drizzle-orm';

import {
  RECIPIENTS_PAGE_SIZE,
  type RecipientListItem,
  type RecipientsPage,
} from './types';

export async function getRecipientsPage(
  searchQuery = '',
  cursor: string | null = null,
  limit = RECIPIENTS_PAGE_SIZE,
): Promise<RecipientsPage> {
  const todayStr = getKSTDateStr(new Date());
  const { startOfWeek, endOfWeek } = getWeekData(todayStr);

  // 이름 검색 조건
  const normalized = searchQuery.trim();
  const whereClause = normalized ? ilike(recipients.name, `%${normalized}%`) : undefined;

  const allRecipients = await db
    .select()
    .from(recipients)
    .where(whereClause)
    .orderBy(desc(recipients.createdAt));

  // 이번 주 일일 기록만 한 번에 조회
  const weeklyRecordsRaw = await db
    .select({ recipientId: records.recipientId, date: records.date })
    .from(records)
    .where(
      and(
        eq(records.type, 'daily'),
        gte(records.date, startOfWeek),
        lte(records.date, endOfWeek),
      ),
    );

  // 오늘 일일 기록 여부 조회
  const todayRecordsRaw = await db
    .select({ recipientId: records.recipientId })
    .from(records)
    .where(and(eq(records.type, 'daily'), eq(records.date, todayStr)));

  // 각 대상자의 가장 최신 일일 기록 날짜를 DB에서 직접 집계
  const latestRecordsRaw = await db
    .select({ recipientId: records.recipientId, date: max(records.date) })
    .from(records)
    .where(eq(records.type, 'daily'))
    .groupBy(records.recipientId);

  // 메모리 집계
  const todaySet = new Set(todayRecordsRaw.map((r) => r.recipientId));

  const weeklyByRecipient = new Map<string, string[]>();
  for (const r of weeklyRecordsRaw) {
    const list = weeklyByRecipient.get(r.recipientId) ?? [];
    list.push(r.date);
    weeklyByRecipient.set(r.recipientId, list);
  }

  const latestByRecipient = new Map<string, string>();
  for (const r of latestRecordsRaw) {
    if (r.date) latestByRecipient.set(r.recipientId, r.date);
  }

  let recipientsWithStats = allRecipients.map((recipient) => {
    const hasTodayRecord = todaySet.has(recipient.id);
    const weeklyRecords = weeklyByRecipient.get(recipient.id) ?? [];
    const latestRecordDate = latestByRecipient.get(recipient.id) ?? null;
    return { ...recipient, hasTodayRecord, weeklyRecords, latestRecordDate };
  });

  // 미작성 대상자 우선, 같은 상태끼리는 등록일 최신순
  recipientsWithStats.sort((a, b) => {
    if (a.hasTodayRecord === b.hasTodayRecord) {
      return b.createdAt.getTime() - a.createdAt.getTime();
    }
    return a.hasTodayRecord ? 1 : -1;
  });

  // cursor 기반 페이지네이션
  const cursorIndex = cursor
    ? recipientsWithStats.findIndex((r) => r.id === cursor)
    : -1;
  const startIndex = cursorIndex >= 0 ? cursorIndex + 1 : 0;
  const pageItems = recipientsWithStats.slice(startIndex, startIndex + limit);
  const hasNextPage = startIndex + limit < recipientsWithStats.length;

  return {
    items: pageItems.map(
      ({ id, name, latestRecordDate, weeklyRecords }): RecipientListItem => ({
        id,
        name,
        latestRecordDate,
        weeklyRecords,
      }),
    ),
    nextCursor:
      hasNextPage && pageItems.length > 0
        ? pageItems[pageItems.length - 1].id
        : null,
  };
}
