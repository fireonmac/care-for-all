import { getRecipientsPage } from '@/features/recipients/queries';
import { getSession } from '@/lib/auth';
import { RECIPIENTS_PAGE_SIZE } from '@/features/recipients/types';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }
  if (!session.user.emailVerified) {
    return Response.json({ error: '이메일 인증이 필요합니다.' }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const searchQuery = searchParams.get('q') ?? '';
  const cursor = searchParams.get('cursor');
  const requestedLimit = Number(searchParams.get('limit'));
  const limit = Number.isInteger(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 50)
    : RECIPIENTS_PAGE_SIZE;

  const page = await getRecipientsPage(searchQuery, cursor, limit);

  return Response.json(page, { headers: { 'Cache-Control': 'private, no-store' } });
}
