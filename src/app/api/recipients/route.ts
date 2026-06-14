import { getRecipientsPage } from '@/features/recipients/queries';
import { RECIPIENTS_PAGE_SIZE } from '@/features/recipients/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const searchQuery = searchParams.get('q') ?? '';
  const cursor = searchParams.get('cursor');
  const requestedLimit = Number(searchParams.get('limit'));
  const limit = Number.isInteger(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 50)
    : RECIPIENTS_PAGE_SIZE;

  const page = await getRecipientsPage(searchQuery, cursor, limit);

  return Response.json(page);
}
