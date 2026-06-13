'use client';

import { useState } from 'react';
import { generateWeeklyDraft, saveWeeklyReport } from './actions';
import { useRouter } from 'next/navigation';
import { Dialog } from '@base-ui/react';

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
    <Dialog.Root open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen && !saving) setReport(null);
    }}>
      <button
        onClick={handleGenerate}
        className="px-4 py-2 bg-surface-800 text-white text-sm font-bold rounded-md hover:bg-surface-900 transition-colors shadow-sm hover:shadow-md"
      >
        주간 리포트 발간
      </button>
      
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-8 rounded-2xl w-[90vw] max-w-2xl shadow-2xl z-50 outline-none flex flex-col max-h-[85vh]">
          <Dialog.Title className="text-2xl font-bold text-foreground mb-4 tracking-tight">
            주간 요양보호기록 종합
          </Dialog.Title>
          
          <div className="flex-1 overflow-y-auto mb-6 pr-2">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 text-surface-500 gap-4">
                <div className="w-8 h-8 border-2 border-surface-200 border-t-primary-500 rounded-full animate-spin"></div>
                <p className="font-medium">기록을 종합하여 작성 중입니다...</p>
              </div>
            ) : report !== null ? (
              <textarea
                className="w-full h-64 bg-surface-50 border border-surface-200 rounded-xl p-6 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 resize-none transition-all text-surface-900 text-base leading-relaxed shadow-inner"
                value={report}
                onChange={(e) => setReport(e.target.value)}
              />
            ) : null}
          </div>

          <div className="flex justify-end gap-3 shrink-0">
            <Dialog.Close className="px-6 py-3 text-surface-600 font-medium rounded-lg hover:bg-surface-100 transition-colors">
              닫기
            </Dialog.Close>
            {!loading && report !== null && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-8 py-3 bg-primary-500 text-white font-bold rounded-lg hover:bg-primary-600 transition-colors shadow-sm disabled:opacity-50 hover:-translate-y-0.5 transition-transform"
              >
                {saving ? '저장 중...' : '최종 저장하기'}
              </button>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
