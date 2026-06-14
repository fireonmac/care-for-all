'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Modal, ModalClose } from '@/components/Modal';
import { Textarea } from '@/components/Textarea';
import { Loader2 } from 'lucide-react';

export function WeeklyReportForm({ recipientId, dailyRecordCount, weekStartDate }: { recipientId: string, dailyRecordCount: number, weekStartDate: string }) {
  const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'COMPLETED' | 'FAILED'>('IDLE');
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  if (dailyRecordCount < 2) {
    return null;
  }

  // 폴링 및 초기 상태 로직
  useEffect(() => {
    if (!weekStartDate) return;
    checkInitialStatus();
    return () => stopPolling();
  }, [recipientId, weekStartDate]);

  const checkInitialStatus = async () => {
    try {
      const res = await fetch('/api/generate-weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId, targetDate: weekStartDate }),
      });
      const data = await res.json();
      
      if (res.status === 200 && data.status === 'COMPLETED') {
        setStatus('COMPLETED');
        fetchContent(data.recordId);
      } else if (res.status === 202 && data.status === 'PROCESSING') {
        setStatus('PROCESSING');
        startPolling(data.recordId);
      } else {
        setStatus('IDLE');
      }
    } catch (e) {
      setStatus('IDLE');
    }
  };

  const fetchContent = async (id: string) => {
    const res = await fetch(`/api/records/${id}`);
    const data = await res.json();
    if (data.combinedContent) {
      setReport(data.combinedContent);
    }
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const startPolling = (id: string) => {
    stopPolling();
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/records/${id}`);
        const data = await res.json();
        
        if (data.status === 'COMPLETED') {
          stopPolling();
          setStatus('COMPLETED');
          setReport(data.combinedContent);
          setToastVisible(false); // 토스트 숨김
        } else if (data.status === 'FAILED') {
          stopPolling();
          setStatus('FAILED');
          setToastVisible(false);
        }
      } catch (error) {
        console.error('Polling error', error);
      }
    }, 3000);
  };

  const handleGenerate = async () => {
    setStatus('PROCESSING');
    setToastVisible(true);
    
    // 토스트는 3초 뒤 자동 숨김 (작업은 계속됨)
    setTimeout(() => setToastVisible(false), 4000);

    try {
      const res = await fetch('/api/generate-weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId, targetDate: weekStartDate }),
      });
      const data = await res.json();
      
      if (data.recordId) {
        startPolling(data.recordId);
      }
    } catch (error) {
      setStatus('FAILED');
      setToastVisible(false);
    }
  };

  return (
    <>
      {/* 화면 최상단 토스트 알림 */}
      {toastVisible && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-5 duration-300">
          <div className="bg-black text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 text-base font-medium tracking-widest">
            <Loader2 className="w-5 h-5 animate-spin" />
            백그라운드에서 주간 리포트 발간을 시작했습니다.
          </div>
        </div>
      )}

      {/* 상태별 상단 버튼 */}
      {status === 'IDLE' || status === 'FAILED' ? (
        <button
          onClick={handleGenerate}
          className="px-5 py-2.5 bg-white border border-surface-300 text-surface-700 text-sm font-medium rounded-lg hover:bg-surface-50 hover:border-black hover:text-black tracking-widest transition-colors"
        >
          {status === 'FAILED' ? '발간 실패 (재시도)' : '주간 리포트 발간'}
        </button>
      ) : status === 'PROCESSING' ? (
        <button
          disabled
          className="px-5 py-2.5 bg-surface-100 border border-surface-200 text-surface-600 text-sm font-medium rounded-lg flex items-center gap-2 tracking-widest cursor-wait"
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          발간 중...
        </button>
      ) : (
        <Modal
          open={open}
          onOpenChange={setOpen}
          title="주간 요양보호기록 종합"
          maxWidth="max-w-2xl"
          trigger={
            <button className="px-5 py-2.5 bg-black text-white text-sm font-medium rounded-lg hover:bg-surface-800 tracking-widest transition-colors shadow-sm">
              주간 리포트 확인
            </button>
          }
          footer={
            <>
              <ModalClose className="text-base font-medium tracking-widest text-surface-500 hover:text-black">
                닫기
              </ModalClose>
            </>
          }
        >
          <div className="flex flex-col h-full min-h-[300px]">
            <Textarea
              className="text-lg h-64 shadow-inner"
              value={report || ''}
              readOnly
            />
          </div>
        </Modal>
      )}
    </>
  );
}
