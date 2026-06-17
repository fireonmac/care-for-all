import { NextRequest } from 'next/server';
import { streamDailyRecord } from '@/lib/ai';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { keywords } = await req.json();

  if (typeof keywords !== 'string' || !keywords.trim()) {
    return Response.json({ error: '관찰 내용을 입력해주세요.' }, { status: 400 });
  }

  try {
    const contentStream = await streamDailyRecord(keywords);

    return new Response(contentStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
      },
    });
  } catch (error) {
    console.error('Daily record generation failed:', error);
    return Response.json({ error: 'AI 서비스 연결에 실패했습니다.' }, { status: 502 });
  }
}
