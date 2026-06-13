'use client';

import { useState } from 'react';
import { deleteRecord } from './actions';
import { useRouter } from 'next/navigation';
import { Copy, Check, Pencil, Trash2 } from 'lucide-react';
import { Dialog } from '@base-ui/react/Dialog';

export function TodayRecordView({ record, recipientId }: { record: any, recipientId: string }) {
  const [saving, setSaving] = useState(false);
  const [copiedCog, setCopiedCog] = useState(false);
  const [copiedBeh, setCopiedBeh] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const router = useRouter();

  const handleCopy = (text: string, type: 'cog' | 'beh') => {
    navigator.clipboard.writeText(text);
    if (type === 'cog') {
      setCopiedCog(true);
      setTimeout(() => setCopiedCog(false), 2000);
    } else {
      setCopiedBeh(true);
      setTimeout(() => setCopiedBeh(false), 2000);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    await deleteRecord(record.id);
    setSaving(false);
    setDeleteModalOpen(false);
    router.refresh();
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-20 gap-6">
        <h2 className="text-3xl font-medium text-black tracking-tight">상세 기록</h2>
        <div className="flex gap-8 items-center">
          <button 
            onClick={() => router.push(`/recipients/${recipientId}/edit?date=${record.date}`)} 
            className="flex items-center gap-2 text-base font-medium tracking-widest text-surface-500 hover:text-black transition-colors"
          >
            <Pencil size={18} />
            <span>수정</span>
          </button>
          
          <Dialog.Root open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
            <Dialog.Trigger className="flex items-center gap-2 text-base font-medium tracking-widest text-surface-500 hover:text-status-danger transition-colors cursor-pointer">
              <Trash2 size={18} />
              <span>삭제</span>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Backdrop className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity" />
              <Dialog.Popup className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-10 rounded-2xl w-[90vw] max-w-md shadow-2xl z-50 outline-none flex flex-col">
                <Dialog.Title className="text-xl font-medium text-black mb-4 tracking-tight">
                  기록 삭제
                </Dialog.Title>
                <Dialog.Description className="text-surface-600 font-light mb-10 leading-relaxed">
                  이 기록을 정말 삭제하시겠습니까? 삭제된 기록은 복구할 수 없습니다.
                </Dialog.Description>
                <div className="flex justify-end gap-6 pt-4 border-t border-surface-200">
                  <Dialog.Close className="text-base font-medium tracking-widest text-surface-500 hover:text-black">
                    취소
                  </Dialog.Close>
                  <button
                    onClick={handleDelete}
                    disabled={saving}
                    className="px-8 py-3 bg-status-danger text-white text-base font-medium tracking-widest rounded-xl hover:bg-status-danger/90 disabled:opacity-50"
                  >
                    {saving ? '삭제 중...' : '삭제하기'}
                  </button>
                </div>
              </Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>

        </div>
      </div>

      <div className="flex flex-col gap-24">
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-medium text-black tracking-widest">인지 영역</h3>
            <button
              onClick={() => handleCopy(record.cognitionContent, 'cog')}
              className="flex items-center gap-2 text-sm font-medium tracking-widest text-surface-500 hover:text-black transition-colors"
            >
              {copiedCog ? <Check size={16} /> : <Copy size={16} />}
              <span>복사</span>
            </button>
          </div>
          <p className="text-xl text-surface-700 font-light leading-[1.8] whitespace-pre-wrap bg-surface-100 p-6 rounded-xl">{record.cognitionContent}</p>
        </div>
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-medium text-black tracking-widest">행동 영역</h3>
            <button
              onClick={() => handleCopy(record.behaviorContent, 'beh')}
              className="flex items-center gap-2 text-sm font-medium tracking-widest text-surface-500 hover:text-black transition-colors"
            >
              {copiedBeh ? <Check size={16} /> : <Copy size={16} />}
              <span>복사</span>
            </button>
          </div>
          <p className="text-xl text-surface-700 font-light leading-[1.8] whitespace-pre-wrap bg-surface-100 p-6 rounded-xl">{record.behaviorContent}</p>
        </div>
      </div>
    </div>
  );
}
