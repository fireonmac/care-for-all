'use client';

import { useState } from 'react';
import { updateDailyRecord, deleteRecord } from './actions';
import { useRouter } from 'next/navigation';
import { Copy, Check } from 'lucide-react';

export function TodayRecordView({ record, recipientId }: { record: any, recipientId: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [cognition, setCognition] = useState(record.cognitionContent || '');
  const [behavior, setBehavior] = useState(record.behaviorContent || '');
  const [behavior, setBehavior] = useState(record.behaviorContent || '');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const handleCopy = () => {
    const text = `[인지 영역]\n${record.cognitionContent}\n\n[행동 영역]\n${record.behaviorContent}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
    return (
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-20 gap-6">
          <h2 className="text-3xl font-medium text-black tracking-tight">기록 수정</h2>
        </div>
        
        <div className="flex flex-col gap-16 mb-16">
          <div className="flex flex-col">
            <h3 className="text-base font-medium text-black tracking-widest mb-6">인지 영역</h3>
            <textarea
              className="w-full bg-surface-50 rounded-xl p-6 focus:ring-2 focus:ring-black focus:outline-none text-surface-900 text-xl font-light leading-[1.8] resize-none min-h-[200px]"
              value={cognition}
              onChange={(e) => setCognition(e.target.value)}
            />
          </div>
          
          <div className="flex flex-col">
            <h3 className="text-base font-medium text-black tracking-widest mb-6">행동 영역</h3>
            <textarea
              className="w-full bg-surface-50 rounded-xl p-6 focus:ring-2 focus:ring-black focus:outline-none text-surface-900 text-xl font-light leading-[1.8] resize-none min-h-[200px]"
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
            className="text-base font-medium tracking-widest text-surface-500 hover:text-black"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-10 py-4 bg-black text-white text-base font-medium tracking-widest rounded-xl hover:bg-surface-800 disabled:opacity-50"
          >
            {saving ? '저장 중...' : '저장하기'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-20 gap-6">
        <h2 className="text-3xl font-medium text-black tracking-tight">상세 기록</h2>
        <div className="flex gap-8 items-center">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 text-base font-medium tracking-widest text-surface-500 hover:text-black"
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
            <span>복사</span>
          </button>
          <button 
            onClick={() => setIsEditing(true)} 
            className="text-base font-medium tracking-widest text-surface-500 hover:text-black"
          >
            수정
          </button>
          <button 
            onClick={handleDelete} 
            disabled={saving}
            className="text-base font-medium tracking-widest text-surface-500 hover:text-status-danger"
          >
            삭제
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-24">
        <div>
          <h3 className="text-base font-medium text-black tracking-widest mb-6">인지 영역</h3>
          <p className="text-xl text-surface-700 font-light leading-[1.8] whitespace-pre-wrap bg-surface-50 p-6 rounded-xl">{record.cognitionContent}</p>
        </div>
        <div>
          <h3 className="text-base font-medium text-black tracking-widest mb-6">행동 영역</h3>
          <p className="text-xl text-surface-700 font-light leading-[1.8] whitespace-pre-wrap bg-surface-50 p-6 rounded-xl">{record.behaviorContent}</p>
        </div>
      </div>
    </div>
  );
}
