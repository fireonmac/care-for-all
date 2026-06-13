'use client';

import { useState } from 'react';
import { updateDailyRecord } from '../actions';
import { useRouter } from 'next/navigation';

export function RecordEditForm({ record, recipientId, date }: { record: any, recipientId: string, date: string }) {
  const [cognition, setCognition] = useState(record.cognitionContent || '');
  const [behavior, setBehavior] = useState(record.behaviorContent || '');
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const handleSave = async () => {
    setSaving(true);
    await updateDailyRecord(record.id, cognition, behavior);
    setSaving(false);
    router.push(`/recipients/${recipientId}?date=${date}`);
    router.refresh();
  };

  return (
    <main className="max-w-5xl w-full mx-auto px-6 sm:px-12 pt-24 pb-16 min-h-screen flex flex-col">
      <div className="mb-12">
        <button 
          onClick={() => router.push(`/recipients/${recipientId}?date=${date}`)}
          className="text-base font-medium tracking-widest text-surface-500 hover:text-black"
        >
          ← 상세 페이지로 돌아가기
        </button>
      </div>

      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-black pb-8 mb-20 gap-6">
        <h1 className="text-4xl font-medium text-black tracking-tight">
          기록 수정
        </h1>
      </header>
      
      <div className="flex flex-col gap-16 mb-16">
        <div className="flex flex-col relative">
          <h3 className="text-base font-medium text-black tracking-widest mb-6">인지 영역</h3>
          <textarea
            className="w-full bg-surface-100 rounded-lg p-6 pb-12 focus:ring-2 focus:ring-black focus:outline-none text-surface-900 text-xl font-light leading-[1.8] resize-none min-h-[200px]"
            value={cognition}
            maxLength={1000}
            onChange={(e) => setCognition(e.target.value)}
          />
          <span className="absolute bottom-4 right-6 text-sm text-surface-400 font-light tracking-widest">
            {cognition.length}/1000
          </span>
        </div>
        
        <div className="flex flex-col relative">
          <h3 className="text-base font-medium text-black tracking-widest mb-6">행동 영역</h3>
          <textarea
            className="w-full bg-surface-100 rounded-lg p-6 pb-12 focus:ring-2 focus:ring-black focus:outline-none text-surface-900 text-xl font-light leading-[1.8] resize-none min-h-[200px]"
            value={behavior}
            maxLength={1000}
            onChange={(e) => setBehavior(e.target.value)}
          />
          <span className="absolute bottom-4 right-6 text-sm text-surface-400 font-light tracking-widest">
            {behavior.length}/1000
          </span>
        </div>
      </div>

      <div className="flex justify-end gap-6 border-t border-surface-200 pt-8">
        <button
          onClick={() => router.push(`/recipients/${recipientId}?date=${date}`)}
          className="text-base font-medium tracking-widest text-surface-500 hover:text-black"
        >
          취소
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-10 py-4 bg-black text-white text-base font-medium tracking-widest rounded-lg hover:bg-surface-800 disabled:opacity-50"
        >
          {saving ? '저장 중...' : '저장하기'}
        </button>
      </div>
    </main>
  );
}
