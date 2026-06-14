'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Modal, ModalClose } from '@/components/Modal';
import { Textarea } from '@/components/Textarea';
import { Loader2 } from 'lucide-react';
import { Toast } from '@base-ui/react/toast';

export function WeeklyReportForm(props: { recipientId: string, dailyRecordCount: number, weekStartDate: string }) {
  if (props.dailyRecordCount < 2) {
    return null;
  }

  return (
    <Toast.Provider>
      <WeeklyReportFormInner {...props} />
      <Toast.Portal>
        <Toast.Viewport className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 outline-none">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}

function ToastList() {
  const { toasts } = Toast.useToastManager();
  return toasts.map((toast) => (
    <Toast.Root 
      key={toast.id} 
      toast={toast} 
      className="bg-black text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 text-base font-medium tracking-widest transition-all duration-300 data-[starting-style]:-translate-y-4 data-[starting-style]:opacity-0 data-[ending-style]:-translate-y-4 data-[ending-style]:opacity-0"
    >
      <Loader2 className="w-5 h-5 animate-spin" />
      <Toast.Content>
        <Toast.Title>{toast.title}</Toast.Title>
      </Toast.Content>
    </Toast.Root>
  ));
}

function WeeklyReportFormInner({ recipientId, weekStartDate }: { recipientId: string, weekStartDate: string }) {
  const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'COMPLETED' | 'FAILED'>('IDLE');
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const toastManager = Toast.useToastManager();

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
        
        if (!res.ok || data.error) {
          stopPolling();
          setStatus('IDLE');
          return;
        }

        if (data.status === 'COMPLETED') {
          stopPolling();
          setStatus('COMPLETED');
          setReport(data.combinedContent);
        } else if (data.status === 'FAILED') {
          stopPolling();
          setStatus('FAILED');
        }
      } catch (error) {
        console.error('Polling error', error);
      }
    }, 3000);
  };

  const handleGenerate = async () => {
    setStatus('PROCESSING');
    
    // Base UI Toast 추가
    toastManager.add({
      title: '백그라운드에서 주간 리포트 발간을 시작했습니다.',
    });

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
    }
  };

  return (
    <>
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
