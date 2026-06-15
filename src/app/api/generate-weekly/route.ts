import { NextRequest } from 'next/server';
import { db } from '@/db';
import { records } from '@/db/schema';
import { eq, and, gte, lt } from 'drizzle-orm';
import { getKSTDateStr } from '@/lib/dateUtils';
import { generateWeeklyRecord } from '@/lib/ai';

export const dynamic = 'force-dynamic';

// 비동기 백그라운드 작업 (응답 후 계속 실행됨)
async function processWeeklyReport(recordId: string, recipientId: string, targetDate: string) {
  try {
    // 1. 해당 주간의 일일 기록 모두 가져오기 (targetDate가 월요일이라고 가정하고 7일치 가져오기)
    const startDate = new Date(targetDate);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 7);
    
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
      db.update(records).set({ status: 'FAILED' }).where(eq(records.id, recordId)).run();
      return;
    }

    const finalContent = await generateWeeklyRecord(
      weeklyData.map((record) => ({
        date: record.date,
        cognition: record.cognitionContent,
        behavior: record.behaviorContent,
      })),
    );

    // 4. DB 상태 완료로 업데이트
    db.update(records)
      .set({ 
        status: 'COMPLETED',
        combinedContent: finalContent 
      })
      .where(eq(records.id, recordId))
      .run();

  } catch (error) {
    console.error('주간 리포트 백그라운드 작업 실패:', error);
    db.update(records).set({ status: 'FAILED' }).where(eq(records.id, recordId)).run();
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const recipientId = url.searchParams.get('recipientId');
    const targetDate = url.searchParams.get('targetDate');

    if (!recipientId || !targetDate) {
      return new Response(JSON.stringify({ error: 'Missing parameters' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const existingRecord = await db.select().from(records)
      .where(
        and(
          eq(records.recipientId, recipientId),
          eq(records.type, 'weekly'),
          eq(records.date, targetDate)
        )
      ).get();

    console.log('[GET /api/generate-weekly] existingRecord:', existingRecord);

    if (existingRecord) {
      console.log('[GET /api/generate-weekly] returning existing record status:', existingRecord.status);
      return new Response(JSON.stringify({ recordId: existingRecord.id, status: existingRecord.status }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } else {
      console.log('[GET /api/generate-weekly] returning IDLE');
      return new Response('{"status":"IDLE"}', { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ error: '서버 에러가 발생했습니다.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { recipientId, targetDate } = await req.json();

    if (!recipientId || !targetDate) {
      return new Response(JSON.stringify({ error: '잘못된 요청입니다.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // 1. 이미 진행 중이거나 완료된 주간 리포트가 있는지 확인
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
        return new Response(JSON.stringify({ recordId: existingRecord.id, status: 'PROCESSING' }), { status: 202, headers: { 'Content-Type': 'application/json' } });
      } else if (existingRecord.status === 'COMPLETED') {
        return new Response(JSON.stringify({ recordId: existingRecord.id, status: 'COMPLETED' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      } else {
        // FAILED 인 경우 재시도를 위해 해당 주차의 모든 실패 레코드를 일괄 삭제
        db.delete(records).where(
          and(
            eq(records.recipientId, recipientId),
            eq(records.type, 'weekly'),
            eq(records.date, targetDate),
            eq(records.status, 'FAILED')
          )
        ).run();
      }
    }

    // 2. 새 주간 리포트 작업을 DB에 PROCESSING 상태로 삽입
    const recordId = crypto.randomUUID();
    db.insert(records).values({
      id: recordId,
      recipientId,
      date: targetDate,
      type: 'weekly',
      status: 'PROCESSING',
      createdAt: new Date(),
    }).run();

    // 3. 비동기 백그라운드 작업 트리거 (await 하지 않음 - Fire and Forget)
    processWeeklyReport(recordId, recipientId, targetDate);

    // 4. 즉시 202 Accepted 응답
    return new Response(JSON.stringify({ recordId, status: 'PROCESSING' }), { status: 202, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ error: '서버 에러가 발생했습니다.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
