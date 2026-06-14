import { NextRequest } from 'next/server';
import { db } from '@/db';
import { records } from '@/db/schema';
import { eq, and, gte, lt } from 'drizzle-orm';

const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'gemma4:26b';

// 비동기 백그라운드 작업 (응답 후 계속 실행됨)
async function processWeeklyReport(recordId: string, recipientId: string, targetDate: string) {
  try {
    // 1. 해당 주간의 일일 기록 모두 가져오기 (targetDate가 월요일이라고 가정하고 7일치 가져오기)
    const startDate = new Date(targetDate);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 7);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const weeklyData = db.select()
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

    // 2. AI에게 전달할 데이터 구성
    const promptData = weeklyData.map(d => 
      `[${d.date}]\n인지: ${d.cognitionContent || '없음'}\n행동: ${d.behaviorContent || '없음'}`
    ).join('\n\n');

    // 3. AI 모델 호출 (스트리밍 끄고 전체 응답 대기)
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          {
            role: 'system',
            content: '요양보호시설의 주간 요양보호 기록 종합 작성기입니다. 제공된 한 주간의 일일 관찰 기록들을 종합하여 어르신의 주간 상태 변화와 주요 이슈를 요약된 하나의 리포트 문단으로 작성하세요.'
          },
          {
            role: 'user',
            content: `다음은 어르신의 한 주간 관찰 기록입니다. 주간 리포트를 작성해 주세요.\n\n${promptData}`
          }
        ],
        stream: false, // 백그라운드 작업이므로 스트리밍 불필요
      }),
    });

    if (!response.ok) {
      throw new Error('AI 서비스 연결 실패');
    }

    const result = await response.json();
    const finalContent = result.message?.content || '리포트 생성 실패';

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
      return Response.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const existingRecord = db.select().from(records)
      .where(
        and(
          eq(records.recipientId, recipientId),
          eq(records.type, 'weekly'),
          eq(records.date, targetDate)
        )
      ).get();

    if (existingRecord) {
      return Response.json({ recordId: existingRecord.id, status: existingRecord.status }, { status: 200 });
    } else {
      return Response.json({ status: 'IDLE' }, { status: 200 });
    }
  } catch (error) {
    console.error('API Error:', error);
    return Response.json({ error: '서버 에러가 발생했습니다.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { recipientId, targetDate } = await req.json();

    if (!recipientId || !targetDate) {
      return Response.json({ error: '잘못된 요청입니다.' }, { status: 400 });
    }

    // 1. 이미 진행 중이거나 완료된 주간 리포트가 있는지 확인
    const existingRecord = db.select().from(records)
      .where(
        and(
          eq(records.recipientId, recipientId),
          eq(records.type, 'weekly'),
          eq(records.date, targetDate)
        )
      ).get();

    if (existingRecord) {
      if (existingRecord.status === 'PROCESSING') {
        return Response.json({ recordId: existingRecord.id, status: 'PROCESSING' }, { status: 202 });
      } else if (existingRecord.status === 'COMPLETED') {
        return Response.json({ recordId: existingRecord.id, status: 'COMPLETED' }, { status: 200 });
      } else {
        // FAILED 인 경우 재시도를 위해 삭제 후 재진행 하거나 업데이트
        db.delete(records).where(eq(records.id, existingRecord.id)).run();
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
    return Response.json({ recordId, status: 'PROCESSING' }, { status: 202 });

  } catch (error) {
    console.error('API Error:', error);
    return Response.json({ error: '서버 에러가 발생했습니다.' }, { status: 500 });
  }
}
