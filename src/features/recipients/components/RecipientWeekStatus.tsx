import { Check } from 'lucide-react';

export function RecipientWeekStatus({ weekDates, todayStr, recordDates }: {
  weekDates: { dateStr: string; dayName: string }[];
  todayStr: string;
  recordDates: string[];
}) {
  return (
    <div className="flex gap-3 sm:gap-4" role="list" aria-label="이번 주 작성 현황">
      {weekDates.map(day => {
        const hasRecord = recordDates.includes(day.dateStr);
        const isFuture = day.dateStr > todayStr;
        const status = hasRecord ? '작성 완료' : day.dayName === '일' ? '휴무' : isFuture ? '예정' : '미작성';
        return (
          <div key={day.dateStr} role="listitem" aria-label={`${day.dateStr} ${status}`}
            className={`flex flex-col items-center justify-center gap-1.5 ${(isFuture || day.dayName === '일') ? 'opacity-30' : ''}`}>
            <span aria-hidden="true" className={`text-[11px] tracking-widest ${day.dateStr === todayStr ? 'text-foreground font-semibold' : day.dayName === '일' ? 'text-foreground/80 font-medium' : 'text-foreground font-medium'}`}>
              {day.dayName}
            </span>
            <span aria-hidden="true" className="h-4 flex items-center justify-center">
              {hasRecord ? <Check size={14} strokeWidth={4} className="text-success" /> : day.dayName === '일' ? null : (
                <span className={`w-1.5 h-1.5 rounded-full ${isFuture ? 'bg-muted-foreground' : 'bg-destructive'}`} />
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
