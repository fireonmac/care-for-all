import { getRecipientOr404, getRecipientRecords } from './actions';
import { KeywordInputForm } from './KeywordInputForm';
import { WeeklyReportForm } from './WeeklyReportForm';
import { TodayRecordView } from './TodayRecordView';
import Link from 'next/link';

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
    <main className="max-w-5xl mx-auto px-6 sm:px-8 py-16 min-h-screen flex flex-col">
      <header className="flex justify-between items-end border-b-2 border-black pb-6 mb-16">
        <div className="flex flex-col gap-2">
          <Link 
            href="/"
            className="text-sm font-bold tracking-widest text-surface-400 hover:text-black mb-4"
          >
            ← 목록으로 돌아가기
          </Link>
          <h1 className="text-4xl font-extrabold text-black tracking-tight">
            {recipient.name}
          </h1>
        </div>
        <WeeklyReportForm recipientId={recipient.id} dailyRecordCount={dailyRecordCount} />
      </header>

      {/* 상단: 구조적이고 미니멀한 주간 뷰 */}
      <section className="mb-24">
        <h2 className="text-sm font-bold tracking-widest text-surface-500 mb-10">이번 주 기록 요약</h2>
        
        <div className="flex justify-between items-end border-b border-surface-200 pb-6">
          {weekDates.map(({ dateStr, dayName, isFuture }) => {
            const record = currentWeekRecords.find(r => r.date === dateStr);
            const isSelected = dateStr === targetDate;
            const isToday = dateStr === todayStr;
            
            return (
              <Link 
                key={dateStr}
                href={`/recipients/${recipient.id}?date=${dateStr}`}
                className={`flex flex-col items-center gap-4 transition-all group ${isFuture ? 'opacity-30 pointer-events-none' : 'hover:-translate-y-1'}`}
              >
                <span className={`text-sm font-bold tracking-widest ${isSelected ? 'text-black' : 'text-surface-400 group-hover:text-black'}`}>
                  {dayName}
                </span>
                <span className={`text-3xl font-light ${isSelected ? 'text-black font-medium' : 'text-surface-400 group-hover:text-black'}`}>
                  {dateStr.split('-')[2]}
                </span>
                
                {/* 인디케이터 (극도로 미니멀하게) */}
                <div className="flex h-2 items-center justify-center">
                  {record ? (
                    <div className="w-1.5 h-1.5 rounded-full bg-surface-300"></div>
                  ) : isSelected ? (
                    <div className="w-1.5 h-1.5 rounded-full bg-black"></div>
                  ) : !isFuture && isToday ? (
                    <div className="w-1.5 h-1.5 rounded-full bg-status-danger"></div>
                  ) : !isFuture ? (
                    <div className="w-1.5 h-1.5 rounded-full bg-status-danger opacity-50"></div>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 하단: 컨텐츠 영역 */}
      <section className="flex-1 w-full max-w-4xl mx-auto">
        {!hasTargetRecord ? (
          <KeywordInputForm recipientId={recipient.id} targetDate={targetDate} />
        ) : (
          <TodayRecordView record={targetRecord} recipientId={recipient.id} />
        )}
      </section>
    </main>
  );
}
