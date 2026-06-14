import { db } from '@/db';
import { recipients, records } from '@/db/schema';
import { getWeekData } from '@/lib/dateUtils';
import { format } from 'date-fns';
import { desc } from 'drizzle-orm';

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
  const allRecipients = await db
    .select()
    .from(recipients)
    .orderBy(desc(recipients.createdAt));
  const allRecords = await db
    .select()
    .from(records)
    .orderBy(desc(records.date));

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const { startOfWeek, endOfWeek } = getWeekData(todayStr);

  let recipientsWithStats = allRecipients.map((recipient) => {
    const recipientRecords = allRecords.filter(
      (record) => record.recipientId === recipient.id,
    );
    const hasTodayRecord = recipientRecords.some(
      (record) => record.date === todayStr && record.type === 'daily',
    );
    const latestRecord = recipientRecords.find(
      (record) => record.type === 'daily',
    );
    const weeklyRecords = recipientRecords
      .filter(
        (record) =>
          record.type === 'daily' &&
          record.date >= startOfWeek &&
          record.date <= endOfWeek,
      )
      .map((record) => record.date);

    return {
      id: recipient.id,
      name: recipient.name,
      createdAt: recipient.createdAt,
      hasTodayRecord,
      latestRecordDate: latestRecord?.date ?? null,
      weeklyRecords,
    };
  });

  const normalizedQuery = searchQuery.trim().toLowerCase();
  if (normalizedQuery) {
    recipientsWithStats = recipientsWithStats.filter((recipient) =>
      recipient.name.toLowerCase().includes(normalizedQuery),
    );
  }

  recipientsWithStats.sort((a, b) => {
    if (a.hasTodayRecord === b.hasTodayRecord) {
      return b.createdAt.getTime() - a.createdAt.getTime();
    }
    return a.hasTodayRecord ? 1 : -1;
  });

  const cursorIndex = cursor
    ? recipientsWithStats.findIndex((recipient) => recipient.id === cursor)
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
