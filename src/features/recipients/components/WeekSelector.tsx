'use client';

import { useQueryState } from 'nuqs';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addCalendarDays } from '@/lib/dateUtils';
import { Button } from '@/components/ui/button';

export function WeekSelector({ currentMonth, currentWeekOfMonth, targetDate }: { currentMonth: number, currentWeekOfMonth: number, targetDate: string }) {
  const [, setDateParam] = useQueryState('date', { shallow: false });

  const handlePrev = () => {
    setDateParam(addCalendarDays(targetDate, -7));
  };

  const handleNext = () => {
    setDateParam(addCalendarDays(targetDate, 7));
  };

  return (
    <div className="flex h-11 shrink-0 items-center gap-0 sm:gap-2">
      <Button variant="ghost" size="icon" onClick={handlePrev} className="size-11 text-muted-foreground hover:text-foreground hover:bg-muted" title="이전 주차">
        <ChevronLeft size={20} />
      </Button>
      <span className="w-22 shrink-0 text-center text-base font-medium text-foreground tabular-nums sm:w-32 sm:text-lg sm:tracking-widest">
        {currentMonth}월 {currentWeekOfMonth}주차
      </span>
      <Button variant="ghost" size="icon" onClick={handleNext} className="size-11 text-muted-foreground hover:text-foreground hover:bg-muted" title="다음 주차">
        <ChevronRight size={20} />
      </Button>
    </div>
  );
}
