'use client';

import { useQueryState } from 'nuqs';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, format } from 'date-fns';
import { useEffect, useRef } from 'react';

export function WeekSelector({ currentMonth, currentWeekOfMonth, targetDate, startOfWeek }: { currentMonth: number, currentWeekOfMonth: number, targetDate: string, startOfWeek: string }) {
  const [dateParam, setDateParam] = useQueryState('date', { shallow: false });
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    document.getElementById('week-view')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [targetDate]);

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
      <button onClick={handlePrev} className="p-1 hover:bg-surface-100 rounded text-surface-600 hover:text-black transition-colors" title="이전 주차">
        <ChevronLeft size={20} />
      </button>
      <span className="text-lg font-medium text-black tracking-widest">
        {currentMonth}월 {currentWeekOfMonth}주차
      </span>
      <button onClick={handleNext} className="p-1 hover:bg-surface-100 rounded text-surface-600 hover:text-black transition-colors" title="다음 주차">
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
