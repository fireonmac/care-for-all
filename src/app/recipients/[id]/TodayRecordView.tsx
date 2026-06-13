'use client';

import { useState } from 'react';
import { updateDailyRecord, deleteRecord } from './actions';
import { useRouter } from 'next/navigation';

export function TodayRecordView({ record, recipientId }: { record: any, recipientId: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [cognition, setCognition] = useState(record.cognitionContent || '');
  const [behavior, setBehavior] = useState(record.behaviorContent || '');
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const handleSave = async () => {
    setSaving(true);
    await updateDailyRecord(record.id, cognition, behavior);
    setSaving(false);
    setIsEditing(false);
    router.refresh();
  };

  const handleDelete = async () => {
    if (confirm('해당 일자의 기록을 완전히 삭제하시겠습니까?')) {
      setSaving(true);
      await deleteRecord(record.id);
      router.refresh();
    }
  };

  if (isEditing) {
    return (
      <div className="animate-in fade-in duration-500">
        <h2 className="text-3xl font-extrabold text-black mb-12 tracking-tight">기록 수정</h2>
        
        <div className="flex flex-col gap-10 mb-16">
          <div className="flex flex-col">
            <h3 className="text-base font-bold text-surface-900 tracking-widest border-b border-surface-200 pb-4 mb-6">인지 영역</h3>
            <textarea
              className="w-full bg-surface-50 border border-surface-200 rounded-2xl p-6 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-surface-900 text-lg font-light leading-relaxed resize-none min-h-[160px] shadow-inner"
              value={cognition}
              onChange={(e) => setCognition(e.target.value)}
            />
          </div>
          
          <div className="flex flex-col">
            <h3 className="text-base font-bold text-surface-900 tracking-widest border-b border-surface-200 pb-4 mb-6">행동 영역</h3>
            <textarea
              className="w-full bg-surface-50 border border-surface-200 rounded-2xl p-6 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-surface-900 text-lg font-light leading-relaxed resize-none min-h-[160px] shadow-inner"
              value={behavior}
              onChange={(e) => setBehavior(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-6 border-t border-surface-200 pt-8">
          <button
            onClick={() => {
              setIsEditing(false);
              setCognition(record.cognitionContent || '');
              setBehavior(record.behaviorContent || '');
            }}
            className="text-base font-bold tracking-widest text-surface-500 hover:text-black transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-10 py-4 bg-black text-white text-base font-bold tracking-widest rounded-xl hover:bg-surface-800 transition-colors disabled:opacity-50"
          >
            {saving ? '저장 중...' : '저장하기'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-end mb-12">
        <h2 className="text-3xl font-extrabold text-black tracking-tight">상세 기록</h2>
        <div className="flex gap-6">
          <button 
            onClick={() => setIsEditing(true)} 
            className="text-base font-bold tracking-widest text-surface-500 hover:text-black transition-colors"
          >
            수정
          </button>
          <button 
            onClick={handleDelete} 
            disabled={saving}
            className="text-base font-bold tracking-widest text-surface-500 hover:text-status-danger transition-colors"
          >
            삭제
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-10">
        <div>
          <h3 className="text-base font-bold text-black tracking-widest border-b border-surface-200 pb-4 mb-6">인지 영역</h3>
          <p className="text-xl text-surface-700 font-light leading-relaxed whitespace-pre-wrap bg-surface-50 p-8 rounded-2xl border border-surface-200">{record.cognitionContent}</p>
        </div>
        <div>
          <h3 className="text-base font-bold text-black tracking-widest border-b border-surface-200 pb-4 mb-6">행동 영역</h3>
          <p className="text-xl text-surface-700 font-light leading-relaxed whitespace-pre-wrap bg-surface-50 p-8 rounded-2xl border border-surface-200">{record.behaviorContent}</p>
        </div>
      </div>
    </div>
  );
}
