import { getRecipientOr404, getRecipientRecords } from './actions';
import { KeywordInputForm } from './KeywordInputForm';
import { WeeklyReportForm } from './WeeklyReportForm';
import { TodayRecordView } from './TodayRecordView';
import { WeekSelector } from '@/components/WeekSelector';
import { BackButton } from '@/components/BackButton';
import Link from 'next/link';
import { Check } from 'lucide-react';

import { getWeekData } from '@/lib/dateUtils';

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

  const todayStr = new Date().toISOString().split('T')[0];
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

      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-black pb-8 mb-20 gap-6">
        <h1 className="text-4xl font-medium text-black tracking-tight">
          {recipient.name} <span className="text-2xl font-normal text-surface-700 ml-1">어르신</span>
        </h1>
        <div className="self-start sm:self-auto">
          <WeeklyReportForm recipientId={recipient.id} dailyRecordCount={dailyRecordCount} />
        </div>
      </header>

      {/* 상단: 구조적이고 쾌적한 주간 뷰 */}
      <section id="week-view" className="mb-24 scroll-mt-20">
        <div className="flex items-center mb-6">
          <WeekSelector currentMonth={currentMonth} currentWeekOfMonth={currentWeekOfMonth} targetDate={targetDate} startOfWeek={startOfWeek} />
        </div>
        
        <div className="grid grid-cols-7 gap-4 border-b border-surface-200 pb-8">
          {weekDates.map(({ dateStr, dayName, isFuture }) => {
            const record = currentWeekRecords.find(r => r.date === dateStr);
            const isSelected = dateStr === targetDate;
            const isToday = dateStr === todayStr;
            
            return (
              <Link
                key={dateStr}
                href={`/recipients/${recipient.id}?date=${dateStr}#week-view`}
                className={`flex flex-col items-center justify-center py-6 rounded-xl gap-4 transition-colors ${isSelected ? 'bg-surface-100' : 'hover:bg-surface-50'} ${isFuture ? 'opacity-40 pointer-events-none' : ''}`}
              >
                <span className={`text-sm font-medium tracking-widest ${isSelected ? 'text-black' : 'text-surface-600'}`}>
                  {dayName}
                </span>
                <span className={`text-4xl font-light ${isSelected ? 'text-black font-semibold' : 'text-surface-600'}`}>
                  {dateStr.split('-')[2]}
                </span>
                
                {/* 인디케이터 */}
                <div className="flex h-2 items-center justify-center mt-2 relative">
                  {record ? (
                    <Check size={16} strokeWidth={3} className="text-status-success absolute" />
                  ) : !isFuture ? (
                    <div className="w-2 h-2 rounded-full bg-status-danger"></div>
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-surface-500"></div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 하단: 컨텐츠 영역 */}
      <section className="flex-1 w-full mx-auto">
        {!hasTargetRecord ? (
          <KeywordInputForm key={targetDate} recipientId={recipient.id} targetDate={targetDate} recipientName={recipient.name} />
        ) : (
          <TodayRecordView record={targetRecord} recipientId={recipient.id} />
        )}
      </section>
    </main>
  );
}
