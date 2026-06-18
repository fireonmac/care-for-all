'use client';

import { useDeferredValue, useEffect, useState } from 'react';
import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import Link from 'next/link';
import { Check, Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { recipientQueryKeys } from '@/features/recipients/queryKeys';
import {
  RECIPIENTS_PAGE_SIZE,
  type RecipientListItem,
  type RecipientsPage,
} from '@/features/recipients/types';

type RecipientListProps = {
  recipientsListData: RecipientsPage;
  weekDates: { dateStr: string; dayName: string }[];
  todayStr: string;
};

function removeDuplicates(recipients: RecipientListItem[]) {
  return Array.from(
    new Map(recipients.map((recipient) => [recipient.id, recipient])).values(),
  );
}

async function fetchRecipientsPage({
  searchQuery,
  cursor,
  signal,
}: {
  searchQuery: string;
  cursor: string | null;
  signal?: AbortSignal;
}): Promise<RecipientsPage> {
  const searchParams = new URLSearchParams({
    q: searchQuery,
    limit: String(RECIPIENTS_PAGE_SIZE),
  });

  if (cursor) {
    searchParams.set('cursor', cursor);
  }

  const response = await fetch(`/api/recipients?${searchParams}`, {
    cache: 'no-store',
    signal,
  });

  if (!response.ok) {
    throw new Error('어르신 목록을 불러오지 못했습니다.');
  }

  return response.json();
}

export function RecipientList({ 
  recipientsListData,
  weekDates, 
  todayStr 
}: RecipientListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery.trim());
  const { ref: loadMoreRef, inView } = useInView({
    rootMargin: '200px',
  });

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isLoading,
    refetch,
    status,
  } = useInfiniteQuery<
    RecipientsPage,
    Error,
    InfiniteData<RecipientsPage, string | null>,
    ReturnType<typeof recipientQueryKeys.list>,
    string | null
  >({
    queryKey: recipientQueryKeys.list(deferredSearchQuery),
    queryFn: ({ pageParam, signal }) =>
      fetchRecipientsPage({
        searchQuery: deferredSearchQuery,
        cursor: pageParam,
        signal,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialData:
      deferredSearchQuery.length === 0
        ? {
            pages: [recipientsListData],
            pageParams: [null],
          }
        : undefined,
  });

  const isSearchPending = searchQuery.trim() !== deferredSearchQuery;
  const visibleRecipients = isSearchPending
    ? []
    : removeDuplicates(data?.pages.flatMap((page) => page.items) ?? []);

  useEffect(() => {
    if (inView && hasNextPage && !isFetching) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, inView, isFetching]);

  const isInitialLoading =
    isSearchPending || (isLoading && !isFetchingNextPage);

  return (
    <div className="flex flex-col">
      <div className="relative mb-12">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          {isInitialLoading ? (
            <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
          ) : (
            <Search className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <Input
          type="text"
          placeholder="어르신 이름 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 pr-4 py-3 text-lg border-border focus-visible:ring-1"
        />
      </div>

      <div className="flex flex-col gap-6">
        {status === 'error' ? (
          <div className="py-24 flex flex-col items-center justify-center gap-5 text-center">
            <p className="text-xl text-destructive">{error.message}</p>
            <Button
              type="button"
              onClick={() => void refetch()}
              variant="outline"
            >
              다시 시도
            </Button>
          </div>
        ) : visibleRecipients.length === 0 && !isInitialLoading ? (
          <div className="py-24 flex flex-col items-center justify-center text-center">
            <p className="text-2xl font-light mb-4 text-foreground tracking-tight">검색된 어르신이 없습니다.</p>
          </div>
        ) : (
          visibleRecipients.map((r) => (
            <Link 
              key={r.id} 
              href={`/recipients/${r.id}`}
              className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-8 border-b border-border group gap-6"
            >
              <div className="flex flex-col gap-3">
                <span className="text-3xl font-medium tracking-tight text-foreground">
                  {r.name} <span className="text-2xl font-normal ml-1 text-foreground/80">어르신</span>
                </span>
                <span className="text-muted-foreground font-normal text-base tracking-wide">
                  최근 작성일: {r.latestRecordDate ? r.latestRecordDate : '-'}
                </span>
              </div>
              <div className="self-start sm:self-auto mt-4 sm:mt-0 flex gap-4">
                {weekDates.map((d) => {
                  const hasRecord = r.weeklyRecords.includes(d.dateStr);
                  const isFuture = d.dateStr > todayStr;
                  return (
                    <div key={d.dateStr} className={`flex flex-col items-center justify-center gap-1.5 ${(isFuture || d.dayName === '일') ? 'opacity-30' : ''}`}>
                      <span className={`text-[11px] tracking-widest ${
                        d.dateStr === todayStr 
                          ? 'text-foreground font-semibold' 
                          : d.dayName === '일' 
                            ? 'text-foreground/80 font-medium' 
                            : 'text-foreground font-medium'
                      }`}>
                        {d.dayName}
                      </span>
                      <div className="h-4 flex items-center justify-center">
                        {hasRecord ? (
                          <Check size={14} strokeWidth={4} className="text-success" />
                        ) : d.dayName === '일' ? null : !isFuture ? (
                          <div className="w-1.5 h-1.5 rounded-full bg-destructive"></div>
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground"></div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Link>
          ))
        )}
        
        <div
          ref={loadMoreRef}
          className="min-h-12 w-full flex items-center justify-center"
        >
          {isInitialLoading || isFetchingNextPage ? (
            <span className="text-muted-foreground text-sm tracking-widest font-light">
              불러오는 중...
            </span>
          ) : !hasNextPage && visibleRecipients.length > 0 ? (
            <span className="text-muted-foreground text-sm tracking-widest font-light">
              모든 어르신을 불러왔습니다.
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
