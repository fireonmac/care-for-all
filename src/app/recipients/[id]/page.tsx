import { getRecipientOr404, getRecipientRecords } from './actions';
import { KeywordInputForm } from './KeywordInputForm';
import { WeeklyReportForm } from './WeeklyReportForm';
import { TodayRecordView } from './TodayRecordView';
import Link from 'next/link';
import { Check } from 'lucide-react';

function getWeekDates(todayStr: string) {
  const today = new Date(todayStr);
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(today.setDate(diff));
  
  const week = [];
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    week.push({
      dateStr,
      dayName: dayNames[d.getDay()],
      isFuture: dateStr > todayStr,
    });
  }
  return week;
}

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

  const weekDates = getWeekDates(todayStr);
  const startOfWeek = weekDates[0].dateStr;
  const endOfWeek = weekDates[6].dateStr;
  
  const currentWeekRecords = recentRecords.filter(r => 
    r.date >= startOfWeek && r.date <= endOfWeek && r.type === 'daily'
  );
  
  const dailyRecordCount = currentWeekRecords.length;

  return (
    <main className="max-w-5xl w-full mx-auto px-6 sm:px-12 pt-24 pb-16 min-h-screen flex flex-col">
      <div className="mb-12">
        <Link 
          href="/"
          className="text-base font-medium tracking-widest text-surface-500 hover:text-black"
        >
          ← 목록으로 돌아가기
        </Link>
      </div>

      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-black pb-8 mb-20 gap-6">
        <h1 className="text-4xl font-medium text-black tracking-tight">
          {recipient.name}
        </h1>
        <div className="self-start sm:self-auto">
          <WeeklyReportForm recipientId={recipient.id} dailyRecordCount={dailyRecordCount} />
        </div>
      </header>

      {/* 상단: 구조적이고 쾌적한 주간 뷰 */}
      <section className="mb-24">
        <h2 className="text-base font-medium tracking-widest text-surface-600 mb-10">이번 주 기록 요약</h2>
        
        <div className="grid grid-cols-7 gap-4 border-b border-surface-200 pb-8">
          {weekDates.map(({ dateStr, dayName, isFuture }) => {
            const record = currentWeekRecords.find(r => r.date === dateStr);
            const isSelected = dateStr === targetDate;
            const isToday = dateStr === todayStr;
            
            return (
              <Link
                key={dateStr}
                href={`/recipients/${recipient.id}?date=${dateStr}`}
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
                  ) : isSelected ? (
                    <div className="w-2 h-2 rounded-full bg-black"></div>
                  ) : !isFuture && isToday ? (
                    <div className="w-2 h-2 rounded-full bg-status-danger"></div>
                  ) : !isFuture ? (
                    <div className="w-2 h-2 rounded-full bg-status-danger opacity-50"></div>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 하단: 컨텐츠 영역 */}
      <section className="flex-1 w-full mx-auto">
        {!hasTargetRecord ? (
          <KeywordInputForm key={targetDate} recipientId={recipient.id} targetDate={targetDate} />
        ) : (
          <TodayRecordView record={targetRecord} recipientId={recipient.id} />
        )}
      </section>
    </main>
  );
}
