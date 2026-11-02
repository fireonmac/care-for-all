import { NextRequest } from 'next/server';
import { streamDailyRecord } from '@/lib/ai';
import { getSession } from '@/lib/auth';
import { AiConfigurationError } from '@/lib/ai/config';
import { AccessDeniedError, requireRecipient } from '@/lib/workspace-access';
import { validateAiInput, DAILY_INPUT_LIMIT } from '@/lib/ai/input';

export const runtime = 'nodejs';
export const maxDuration = 90;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  if (!session.user.emailVerified) return Response.json({ error: '이메일 인증이 필요합니다.' }, { status: 403 });
  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: '올바른 요청이 필요합니다.' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || !('keywords' in body) || typeof body.keywords !== 'string'
    || !('recipientId' in body) || typeof body.recipientId !== 'string') {
    return Response.json({ error: '대상자와 관찰 내용을 입력해주세요.' }, { status: 400 });
  }
  try { validateAiInput(body.keywords, DAILY_INPUT_LIMIT); }
  catch { return Response.json({ error: `관찰 내용은 1자 이상 ${DAILY_INPUT_LIMIT}자 이내로 입력해주세요.` }, { status: 400 }); }
  try {
    await requireRecipient(session.user.id, body.recipientId, 'edit');
    const contentStream = await streamDailyRecord(body.keywords);
    return new Response(contentStream, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store, no-transform' } });
  } catch (error) {
    if (error instanceof AccessDeniedError) return Response.json({ error: error.message }, { status: 404 });
    if (error instanceof AiConfigurationError) return Response.json({ error: 'AI 설정이 완료되지 않았습니다. 관리자에게 문의해주세요.' }, { status: 503 });
    return Response.json({ error: 'AI 서비스 연결에 실패했습니다.' }, { status: 502 });
  }
}
