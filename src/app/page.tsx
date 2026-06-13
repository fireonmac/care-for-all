import { getRecipientsWithStats } from './actions';
import { AddRecipientForm } from '@/components/AddRecipientForm';
import Link from 'next/link';
import { Check } from 'lucide-react';

function getWeekDates() {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(today.setDate(diff));
  
  const week = [];
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    week.push({
      dateStr: d.toISOString().split('T')[0],
      dayName: dayNames[d.getDay()],
    });
  }
  return week;
}

export default async function Home() {
  const recipients = await getRecipientsWithStats();
  const weekDates = getWeekDates();
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <main className="max-w-5xl w-full mx-auto px-6 sm:px-12 pt-32 pb-24 min-h-screen">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b-2 border-black pb-8 mb-16 gap-6">
        <h1 className="text-4xl font-medium text-black tracking-tight">
          어르신 목록
        </h1>
        <div className="self-start sm:self-auto">
          <AddRecipientForm />
        </div>
      </header>

      <div className="flex flex-col gap-6">
        {recipients.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-center">
            <p className="text-2xl font-light mb-4 text-surface-900 tracking-tight">등록된 어르신이 없습니다.</p>
            <p className="text-base text-surface-400 font-light tracking-wide">우측 상단의 추가 버튼을 눌러 등록해주세요.</p>
          </div>
        ) : (
          recipients.map((r) => (
            <Link 
              key={r.id} 
              href={`/recipients/${r.id}`}
              className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-8 border-b border-surface-200 group gap-6"
            >
              <div className="flex flex-col gap-3">
                <span className="text-3xl font-medium tracking-tight text-black">
                  {r.name}
                </span>
                <span className="text-surface-500 font-normal text-base tracking-wide">
                  최근 기록: {r.latestRecordDate ? r.latestRecordDate : '없음'}
                </span>
              </div>
              <div className="self-start sm:self-auto mt-4 sm:mt-0 flex gap-4">
                {weekDates.map((d) => {
                  const hasRecord = r.weeklyRecords.includes(d.dateStr);
                  const isFuture = d.dateStr > todayStr;
                  return (
                    <div key={d.dateStr} className={`flex flex-col items-center justify-center gap-1.5 ${isFuture ? 'opacity-30' : ''}`}>
                      <span className={`text-[11px] font-medium tracking-widest ${d.dateStr === todayStr ? 'text-black font-bold' : 'text-surface-400'}`}>
                        {d.dayName}
                      </span>
                      <div className="h-4 flex items-center justify-center">
                        {hasRecord ? (
                          <Check size={14} strokeWidth={4} className="text-status-success" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-surface-300"></div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
