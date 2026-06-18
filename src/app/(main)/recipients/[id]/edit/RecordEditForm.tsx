'use client';

import { useState, useTransition } from 'react';
import { updateDailyRecord } from '../actions';
import { useRouter } from 'next/navigation';
import { BackButton } from '@/components/BackButton';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/useToast';
import type { records } from '@/db/schema';

type DailyRecord = typeof records.$inferSelect;

export function RecordEditForm({ record, recipientId, recipientName, date }: { record: DailyRecord, recipientId: string, recipientName: string, date: string }) {
  const [cognition, setCognition] = useState(record.cognitionContent || '');
  const [behavior, setBehavior] = useState(record.behaviorContent || '');
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [saving, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      try {
        await updateDailyRecord(record.id, cognition, behavior);
        showSuccess('성공적으로 수정되었습니다.');
        router.push(`/recipients/${recipientId}?date=${date}`);
        router.refresh();
      } catch {
        showError('수정에 실패했습니다.');
      }
    });
  };

  // 날짜 포맷 (YYYY-MM-DD -> YYYY년 M월 D일)
  const [year, month, day] = date.split('-');
  const formattedDate = `${year}년 ${parseInt(month)}월 ${parseInt(day)}일`;

  return (
    <main className="max-w-5xl w-full mx-auto px-6 sm:px-12 pt-24 pb-16 min-h-screen flex flex-col">
      <BackButton href={`/recipients/${recipientId}?date=${date}`} label="상세 페이지로 돌아가기" />

      <header className="flex flex-col border-b-2 border-primary pb-8 mb-20 gap-2">
        <span className="text-xl font-normal text-muted-foreground tracking-widest">{formattedDate}</span>
        <h1 className="text-4xl font-medium text-foreground tracking-tight">
          {recipientName} 어르신 일지 수정
        </h1>
      </header>
      
      <div className="flex flex-col gap-16 mb-16">
        <div className="flex flex-col relative">
          <h3 className="text-base font-medium text-foreground tracking-widest mb-6">인지 영역</h3>
          <Textarea
            className="text-xl pb-12 min-h-[200px]"
            value={cognition}
            maxLength={1000}
            onChange={(e) => setCognition(e.target.value)}
          />
          <span className="absolute bottom-4 right-6 text-sm text-muted-foreground font-light tracking-widest">
            {cognition.length}/1000
          </span>
        </div>
        
        <div className="flex flex-col relative">
          <h3 className="text-base font-medium text-foreground tracking-widest mb-6">행동 영역</h3>
          <Textarea
            className="text-xl pb-12 min-h-[200px]"
            value={behavior}
            maxLength={1000}
            onChange={(e) => setBehavior(e.target.value)}
          />
          <span className="absolute bottom-4 right-6 text-sm text-muted-foreground font-light tracking-widest">
            {behavior.length}/1000
          </span>
        </div>
      </div>

      <div className="flex justify-end gap-6 border-t border-border pt-8">
        <Button
          onClick={() => router.push(`/recipients/${recipientId}?date=${date}`)}
          variant="ghost"
        >
          취소
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="px-10 py-4"
        >
          {saving ? '저장 중...' : '저장하기'}
        </Button>
      </div>
    </main>
  );
}
