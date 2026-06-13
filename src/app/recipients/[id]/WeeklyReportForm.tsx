'use client';

import { useState } from 'react';
import { generateWeeklyDraft, saveWeeklyReport } from './actions';
import { useRouter } from 'next/navigation';
import { Modal, ModalClose } from '@/components/Modal';

export function WeeklyReportForm({ recipientId, dailyRecordCount }: { recipientId: string, dailyRecordCount: number }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const router = useRouter();

  if (dailyRecordCount < 2) {
    return null;
  }

  const handleGenerate = async () => {
    setLoading(true);
    setOpen(true);
    try {
      const result = await generateWeeklyDraft(recipientId);
      setReport(result);
    } catch (error) {
      alert('주간 리포트 생성 중 오류가 발생했습니다. Ollama가 실행 중인지 확인해주세요.');
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!report) return;
    setSaving(true);
    await saveWeeklyReport(recipientId, report);
    setSaving(false);
    setOpen(false);
    setReport(null);
    router.refresh();
  };

  return (
    <Modal
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen && !saving) setReport(null);
      }}
      title="주간 요양보호기록 종합"
      maxWidth="max-w-2xl"
      trigger={
        <button
          onClick={handleGenerate}
          className="px-5 py-2.5 bg-white border border-surface-300 text-surface-700 text-sm font-medium rounded-lg hover:bg-surface-50 hover:border-black hover:text-black tracking-widest transition-colors"
        >
          주간 리포트 발간
        </button>
      }
      footer={
        <>
          <ModalClose className="text-base font-medium tracking-widest text-surface-500 hover:text-black">
            닫기
          </ModalClose>
          {!loading && report !== null && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-10 py-4 bg-black text-white text-base font-medium tracking-widest rounded-lg hover:bg-surface-800 disabled:opacity-50"
            >
              {saving ? '저장 중...' : '최종 저장'}
            </button>
          )}
        </>
      }
    >
      <div className="flex flex-col h-full min-h-[300px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center flex-1 text-surface-500 gap-4">
            <div className="w-8 h-8 border-2 border-surface-200 border-t-primary-500 rounded-full animate-spin"></div>
            <p className="font-medium">기록을 종합하여 작성 중입니다...</p>
          </div>
        ) : report !== null ? (
          <textarea
            className="w-full h-64 bg-surface-100 border border-surface-200 rounded-lg p-6 focus:outline-none focus:border-black focus:ring-1 focus:ring-black resize-none text-black text-lg font-light leading-relaxed shadow-inner"
            value={report}
            onChange={(e) => setReport(e.target.value)}
          />
        ) : null}
      </div>
    </Modal>
  );
}
