import { getRecipientsWithStats } from './actions';
import { AddRecipientForm } from '@/components/AddRecipientForm';
import Link from 'next/link';

export default async function Home() {
  const recipients = await getRecipientsWithStats();

  return (
    <main className="max-w-3xl mx-auto px-6 sm:px-8 py-20 min-h-screen">
      <header className="flex justify-between items-end border-b-2 border-black pb-8 mb-16">
        <h1 className="text-4xl font-extrabold text-black tracking-tight">
          어르신 목록
        </h1>
        <AddRecipientForm />
      </header>

      <div className="flex flex-col">
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
              className="flex justify-between items-center py-10 border-b border-surface-200 group transition-all hover:border-black"
            >
              <div className="flex flex-col gap-4">
                <span className="text-3xl font-extrabold tracking-tight text-black group-hover:translate-x-2 transition-transform duration-300">
                  {r.name}
                </span>
                <span className="text-surface-500 font-medium text-base tracking-wide">
                  최근 기록: {r.latestRecordDate ? r.latestRecordDate : '없음'}
                </span>
              </div>
              <div>
                {r.hasTodayRecord ? (
                  <span className="text-sm font-bold tracking-widest text-status-success border border-status-success/30 px-5 py-2.5 rounded-full bg-status-success/5">
                    작성 완료
                  </span>
                ) : (
                  <span className="text-sm font-bold tracking-widest text-surface-500 border border-surface-200 px-5 py-2.5 rounded-full">
                    미작성
                  </span>
                )}
              </div>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
