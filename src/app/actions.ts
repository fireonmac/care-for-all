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
  if (!name.trim()) return { error: '성함을 입력해주세요.' };
  
  await db.insert(recipients).values({
    id: randomUUID(),
    name: name.trim(),
    createdAt: new Date(),
    isActive: true,
  });

  revalidatePath('/');
  return { success: true };
}

export async function getRecipientsWithStats(searchQuery = '', cursor: string | null = null, limit = 10) {
  const { records } = await import('@/db/schema');
  const allRecipients = await db.select().from(recipients).orderBy(desc(recipients.createdAt));
  const allRecords = await db.select().from(records).orderBy(desc(records.date));

  const todayStr = new Date().toISOString().split('T')[0];
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(today.setDate(diff));
  
  const startOfWeek = monday.toISOString().split('T')[0];
  const endOfWeek = new Date(monday.setDate(monday.getDate() + 6)).toISOString().split('T')[0];

  let stats = allRecipients.map(recipient => {
    const recipientRecords = allRecords.filter(r => r.recipientId === recipient.id);
    const hasTodayRecord = recipientRecords.some(r => r.date === todayStr && r.type === 'daily');
    const latestRecord = recipientRecords.find(r => r.type === 'daily');
    
    const weeklyRecords = recipientRecords
      .filter(r => r.type === 'daily' && r.date >= startOfWeek && r.date <= endOfWeek)
      .map(r => r.date);

    return {
      ...recipient,
      hasTodayRecord,
      latestRecordDate: latestRecord ? latestRecord.date : null,
      weeklyRecords,
    };
  });

  // 검색
  if (searchQuery.trim()) {
    const query = searchQuery.trim().toLowerCase();
    stats = stats.filter(r => r.name.toLowerCase().includes(query));
  }

  // 정렬: 미작성자(hasTodayRecord === false) 위로, 그 다음 최신순
  stats.sort((a, b) => {
    if (a.hasTodayRecord === b.hasTodayRecord) {
      return b.createdAt.getTime() - a.createdAt.getTime();
    }
    return a.hasTodayRecord ? 1 : -1;
  });

  // 페이징 (Cursor)
  let startIndex = 0;
  if (cursor) {
    const cursorIndex = stats.findIndex(r => r.id === cursor);
    if (cursorIndex !== -1) {
      startIndex = cursorIndex + 1;
    }
  }

  const sliced = stats.slice(startIndex, startIndex + limit);
  const nextCursor = sliced.length === limit && startIndex + limit < stats.length ? sliced[sliced.length - 1].id : null;

  return {
    data: sliced,
    nextCursor,
  };
}
