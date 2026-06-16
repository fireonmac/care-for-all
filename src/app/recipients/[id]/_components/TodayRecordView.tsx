'use client';

import { useState, useTransition } from 'react';
import { deleteRecord } from '../actions';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';
import { CopyButton } from '@/components/CopyButton';
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal';
import { useToast } from '@/hooks/useToast';
import type { records } from '@/db/schema';

type DailyRecord = typeof records.$inferSelect;

export function TodayRecordView({ record, recipientId }: { record: DailyRecord, recipientId: string }) {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [saving, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteRecord(record.id);
        showSuccess('기록이 성공적으로 삭제되었습니다.');
        setDeleteModalOpen(false);
        router.refresh();
      } catch {
        showError('기록 삭제에 실패했습니다.');
      }
    });
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-20 gap-6">
        <h2 className="text-3xl font-medium text-black tracking-tight">상세 기록</h2>
        <div className="flex gap-2.5 items-center">
          <button
            onClick={() => router.push(`/recipients/${recipientId}/edit?date=${record.date}`)}
            className="flex items-center gap-2 text-sm font-medium tracking-widest text-black hover:bg-surface-50 bg-white border border-surface-300 px-4 py-2 rounded-lg transition-colors"
          >
            <Pencil size={16} />
            <span>수정</span>
          </button>

          <ConfirmDeleteModal
            open={deleteModalOpen}
            onOpenChange={setDeleteModalOpen}
            title="기록 삭제"
            message="이 기록을 정말 삭제하시겠습니까? 삭제된 기록은 복구할 수 없습니다."
            onConfirm={handleDelete}
            isLoading={saving}
            trigger={
              <button
                onClick={() => setDeleteModalOpen(true)}
                className="flex items-center gap-2 text-sm font-medium tracking-widest text-black hover:bg-surface-50 hover:text-status-danger bg-white border border-surface-300 px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 size={16} />
                <span>삭제</span>
              </button>
            }
          />
        </div>
      </div>

      <div className="flex flex-col gap-24">
        <div>
          <div className="flex items-center gap-3 mb-6">
            <h3 className="text-base font-medium text-black tracking-widest">인지 영역</h3>
            <CopyButton text={record.cognitionContent ?? ''} title="인지 영역 복사" />
          </div>
          <p className="text-xl text-surface-700 font-light leading-[1.8] whitespace-pre-wrap bg-surface-100 p-6 rounded-lg">{record.cognitionContent}</p>
        </div>
        <div>
          <div className="flex items-center gap-3 mb-6">
            <h3 className="text-base font-medium text-black tracking-widest">행동 영역</h3>
            <CopyButton text={record.behaviorContent ?? ''} title="행동 영역 복사" />
          </div>
          <p className="text-xl text-surface-700 font-light leading-[1.8] whitespace-pre-wrap bg-surface-100 p-6 rounded-lg">{record.behaviorContent}</p>
        </div>
      </div>
    </div>
  );
}
