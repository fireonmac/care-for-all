import { getRecipientsWithStats } from './actions';
import { AddRecipientForm } from '@/components/AddRecipientForm';
import Link from 'next/link';

export default async function Home() {
  const recipients = await getRecipientsWithStats();

  return (
    <main className="max-w-5xl w-full mx-auto px-6 sm:px-12 py-24 min-h-screen">
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
              <div className="self-start sm:self-auto mt-2 sm:mt-0">
                {r.hasTodayRecord ? (
                  <span className="text-sm font-medium tracking-widest text-status-success px-5 py-2.5 rounded-lg bg-status-success/10 border border-status-success/20">
                    작성 완료
                  </span>
                ) : (
                  <span className="text-sm font-medium tracking-widest text-surface-500 px-5 py-2.5 rounded-lg bg-surface-100 border border-surface-200">
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
