'use client';

import { useQueryState } from 'nuqs';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function WeekSelector({ currentMonth, currentWeekOfMonth }: { currentMonth: number, currentWeekOfMonth: number }) {
  const [week, setWeek] = useQueryState('week', { defaultValue: '0', shallow: false });

  const currentOffset = parseInt(week || '0', 10);

  const handlePrev = () => setWeek((currentOffset - 1).toString());
  const handleNext = () => setWeek((currentOffset + 1).toString());

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
