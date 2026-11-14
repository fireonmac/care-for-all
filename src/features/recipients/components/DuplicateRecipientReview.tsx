'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import type { addRecipient } from '../actions';
import { RecipientWeekStatus } from './RecipientWeekStatus';
import { ArrowUpRight } from 'lucide-react';

export type DuplicateRegistration = Extract<Awaited<ReturnType<typeof addRecipient>>, { status: 'duplicate' }>;

export function DuplicateRecipientReview({ review }: { review: DuplicateRegistration }) {
  const headingRef = useRef<HTMLDivElement>(null);
  useEffect(() => { headingRef.current?.focus(); }, [review]);

  return (
    <div ref={headingRef} tabIndex={-1} role="group" aria-label="같은 이름의 어르신" className="space-y-5 outline-none">
      <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
        {review.matches.length ? review.matches.map(recipient => (
          <div key={recipient.id} className="space-y-4 p-5">
            <Link href={`/recipients/${recipient.id}`} className="flex items-center justify-between gap-3 font-medium text-lg hover:underline underline-offset-4">
              <span>{recipient.name} <span className="font-normal text-muted-foreground">어르신</span></span>
              <ArrowUpRight aria-hidden="true" size={18} className="shrink-0 text-muted-foreground" />
            </Link>
            <RecipientWeekStatus weekDates={review.weekDates} todayStr={review.todayStr} recordDates={recipient.weeklyRecords} />
          </div>
        )) : <p className="p-5 text-sm text-muted-foreground">조회 권한이 없는 어르신입니다.</p>}
      </div>
      <p className="text-sm text-muted-foreground">저장할 이름 · <strong className="font-medium text-foreground">{review.suggestedName}</strong></p>
    </div>
  );
}
