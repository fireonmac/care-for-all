'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import type { addRecipient } from '../actions';

export type DuplicateRegistration = Extract<Awaited<ReturnType<typeof addRecipient>>, { status: 'duplicate' }>;

export function DuplicateRecipientReview({ review }: { review: DuplicateRegistration }) {
  const headingRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { headingRef.current?.focus(); }, [review]);

  return (
    <div className="flex flex-col gap-6">
      <p ref={headingRef} tabIndex={-1} className="text-lg leading-relaxed outline-none">
        같은 기관에 같은 이름의 어르신이 있습니다. 기존 어르신인지 먼저 확인해주세요.
      </p>
      {review.matches.length ? review.matches.map(recipient => (
        <div key={recipient.id} className="rounded-xl border border-border p-4 space-y-4">
          <Link href={`/recipients/${recipient.id}`} className="text-lg font-medium underline underline-offset-4 focus-visible:outline-ring">
            {recipient.name} 어르신 보기 →
          </Link>
          <table className="w-full table-fixed text-center text-sm">
            <caption className="text-left text-muted-foreground mb-2">이번 주 기록</caption>
            <thead><tr>{review.weekDates.map(day => <th key={day.dateStr} scope="col" className="py-1 font-normal" title={day.dateStr}>{day.dayName}</th>)}</tr></thead>
            <tbody><tr>{review.weekDates.map(day => {
              const hasRecord = recipient.weeklyRecords.includes(day.dateStr);
              return <td key={day.dateStr} className="py-1" aria-label={`${day.dateStr} ${hasRecord ? '작성 완료' : '기록 없음'}`}>
                <span aria-hidden="true" className={hasRecord ? 'text-success' : 'text-muted-foreground'}>{hasRecord ? '✓' : '—'}</span>
              </td>;
            })}</tr></tbody>
          </table>
        </div>
      )) : <p className="text-sm text-muted-foreground">조회 권한이 없는 어르신의 정보는 표시하지 않습니다.</p>}
      <p className="text-sm leading-relaxed text-muted-foreground">
        다른 어르신이라면 <strong className="text-foreground">{review.suggestedName}</strong> 이름으로 추가할 수 있습니다.
      </p>
    </div>
  );
}
