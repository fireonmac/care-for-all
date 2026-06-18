import { getRecipientOr404, getRecipientRecords } from './queries';
import { KeywordInputForm } from './_components/KeywordInputForm/KeywordInputForm';
import { WeeklyReportForm } from './_components/WeeklyReportForm';
import { TodayRecordView } from './_components/TodayRecordView';
import { WeekSelector } from '@/features/recipients/components/WeekSelector';
import { BackButton } from '@/components/BackButton';
import Link from 'next/link';
import { Check } from 'lucide-react';

import { isSunday } from 'date-fns';
import { getWeekData, getKSTDateStr } from '@/lib/dateUtils';

export default async function RecipientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;
  
  const recipient = await getRecipientOr404(resolvedParams.id);
  const recentRecords = await getRecipientRecords(resolvedParams.id);

  const todayStr = getKSTDateStr(new Date());
  const targetDate = resolvedSearch.date || todayStr;
  
  const targetRecord = recentRecords.find((r) => r.date === targetDate && r.type === 'daily');
  const hasTargetRecord = !!targetRecord;

  const { weekDates, currentMonth, currentWeekOfMonth, startOfWeek, endOfWeek } = getWeekData(targetDate);
  
  const currentWeekRecords = recentRecords.filter(r => 
    r.date >= startOfWeek && r.date <= endOfWeek && r.type === 'daily'
  );
  
  const dailyRecordCount = currentWeekRecords.length;

  return (
    <main className="max-w-5xl w-full mx-auto px-6 sm:px-12 pt-24 pb-16 min-h-screen flex flex-col">
      <BackButton href="/" label="목록으로 돌아가기" />

      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-primary pb-8 mb-20 gap-6 min-h-[88px] sm:min-h-0">
        <h1 className="text-4xl font-medium text-foreground tracking-tight">
          {recipient.name} <span className="text-2xl font-normal text-foreground/80 ml-1">어르신</span>
        </h1>
        <div className="self-start sm:self-auto min-h-[44px] flex items-center">
          <WeeklyReportForm 
            recipientId={recipient.id} 
            recipientName={recipient.name}
            currentMonth={currentMonth}
            currentWeekOfMonth={currentWeekOfMonth}
            dailyRecordCount={dailyRecordCount} 
            weekStartDate={weekDates[0].dateStr} 
          />
        </div>
      </header>

      {/* 상단: 구조적이고 쾌적한 주간 뷰 */}
      <section id="week-view" className="mb-24 scroll-mt-20">
        <div className="flex items-center mb-6">
          <WeekSelector currentMonth={currentMonth} currentWeekOfMonth={currentWeekOfMonth} targetDate={targetDate} />
        </div>
        
        <div className="grid grid-cols-7 gap-4 border-b border-border pb-8">
          {weekDates.map(({ dateStr, dayName, isFuture }) => {
            const record = currentWeekRecords.find(r => r.date === dateStr);
            const isSelected = dateStr === targetDate;
            return (
              <Link
                key={dateStr}
                href={`/recipients/${recipient.id}?date=${dateStr}#week-view`}
                className={`flex flex-col items-center justify-center py-6 rounded-xl gap-4 transition-colors ${isSelected ? 'bg-muted' : 'hover:bg-muted'} ${isFuture ? 'opacity-40 pointer-events-none' : ''}`}
              >
                <span className={`text-sm font-medium tracking-widest ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {dayName}
                </span>
                <span className={`text-4xl font-light ${isSelected ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                  {dateStr.split('-')[2]}
                </span>
                
                {/* 인디케이터 */}
                <div className="flex h-2 items-center justify-center mt-2 relative">
                  {record ? (
                    <Check size={16} strokeWidth={3} className="text-success absolute" />
                  ) : dayName === '일' ? null : !isFuture ? (
                    <div className="w-2 h-2 rounded-full bg-destructive"></div>
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-muted-foreground"></div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 하단: 컨텐츠 영역 */}
      <section className="flex-1 w-full mx-auto">
        {hasTargetRecord ? (
          <TodayRecordView record={targetRecord} recipientId={recipient.id} />
        ) : isSunday(new Date(targetDate + 'T00:00:00')) ? (
          <div className="flex flex-col items-center justify-center py-32 px-4 text-center bg-muted rounded-[2rem] border border-border mt-4">
            <span className="text-5xl mb-6">☕️</span>
            <h2 className="text-2xl font-semibold text-foreground mb-3 tracking-tight">일요일은 휴무일입니다</h2>
            <p className="text-muted-foreground text-lg leading-relaxed max-w-sm">
              오늘은 어르신을 뵙지 않는 날이네요.<br/>
              선생님도 편안하고 따뜻한 휴식 보내시길 바랍니다!
            </p>
          </div>
        ) : (
          <KeywordInputForm key={targetDate} recipientId={recipient.id} targetDate={targetDate} />
        )}
      </section>
    </main>
  );
}
