'use client';

import { useQueryState } from 'nuqs';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, format } from 'date-fns';
import { Button } from '@/components/ui/button';

export function WeekSelector({ currentMonth, currentWeekOfMonth, targetDate }: { currentMonth: number, currentWeekOfMonth: number, targetDate: string }) {
  const [, setDateParam] = useQueryState('date', { shallow: false });

  const handlePrev = () => {
    const newDate = addDays(new Date(targetDate), -7);
    setDateParam(format(newDate, 'yyyy-MM-dd'));
  };

  const handleNext = () => {
    const newDate = addDays(new Date(targetDate), 7);
    setDateParam(format(newDate, 'yyyy-MM-dd'));
  };

  return (
    <div className="flex items-center gap-4">
      <Button variant="ghost" size="icon" onClick={handlePrev} className="w-8 h-8 text-muted-foreground hover:text-foreground hover:bg-muted" title="이전 주차">
        <ChevronLeft size={20} />
      </Button>
      <span className="text-lg font-medium text-foreground tracking-widest">
        {currentMonth}월 {currentWeekOfMonth}주차
      </span>
      <Button variant="ghost" size="icon" onClick={handleNext} className="w-8 h-8 text-muted-foreground hover:text-foreground hover:bg-muted" title="다음 주차">
        <ChevronRight size={20} />
      </Button>
    </div>
  );
}
