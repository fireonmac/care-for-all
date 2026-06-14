'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Modal, ModalClose } from '@/components/Modal';
import { Textarea } from '@/components/Textarea';
import { Loader2, AlertCircle, AlertTriangle, Check, Copy } from 'lucide-react';
import { Toast } from '@base-ui/react/toast';

export function WeeklyReportForm(props: { 
  recipientId: string, 
  recipientName: string,
  currentMonth: number,
  currentWeekOfMonth: number,
  dailyRecordCount: number, 
  weekStartDate: string 
}) {
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
  return toasts.map((toast: any) => (
    <Toast.Root 
      key={toast.id} 
      toast={toast} 
      className="bg-black text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 text-base font-medium tracking-widest transition-all duration-300 data-[starting-style]:-translate-y-4 data-[starting-style]:opacity-0 data-[ending-style]:-translate-y-4 data-[ending-style]:opacity-0"
    >
      {toast.type === 'error' ? (
        <AlertCircle className="w-5 h-5 text-red-400" />
      ) : null}
      <Toast.Content>
        <Toast.Title className={toast.type === 'error' ? 'text-red-400' : ''}>
          {toast.title}
        </Toast.Title>
      </Toast.Content>
    </Toast.Root>
  ));
}

function WeeklyReportFormInner({ 
  recipientId, 
  recipientName,
  currentMonth,
  currentWeekOfMonth,
  weekStartDate 
}: { 
  recipientId: string, 
  recipientName: string,
  currentMonth: number,
  currentWeekOfMonth: number,
  weekStartDate: string 
}) {
  const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'COMPLETED' | 'FAILED'>('IDLE');
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
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
      const timestamp = Date.now();
      const res = await fetch(`/api/generate-weekly?recipientId=${recipientId}&targetDate=${weekStartDate}&t=${timestamp}`, { cache: 'no-store' });
      const data = await res.json();
      
      if (data.status === 'COMPLETED') {
        setStatus('COMPLETED');
        fetchContent(data.recordId);
      } else if (data.status === 'PROCESSING') {
        setStatus('PROCESSING');
        startPolling(data.recordId);
      } else if (data.status === 'FAILED') {
        setStatus('FAILED');
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

  const handleFail = () => {
    stopPolling();
    setStatus('FAILED');
    const toastId = toastManager.add({
      title: '발간 작업 중 오류가 발생했습니다.',
      type: 'error',
    } as any);
    setTimeout(() => toastManager.close(toastId), 4000);
  };

  const startPolling = (id: string) => {
    stopPolling();
    pollingIntervalRef.current = setInterval(async () => {
      try {
        // 완벽한 캐시 무효화를 위해 URL 파라미터에 현재 시간(타임스탬프) 추가
        const timestamp = Date.now();
        const res = await fetch(`/api/records/${id}?t=${timestamp}`, { cache: 'no-store' });
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
          handleFail();
        }
      } catch (error) {
        console.error('Polling error', error);
        handleFail();
      }
    }, 3000);
  };

  const handleGenerate = async () => {
    setStatus('PROCESSING');
    
    const toastId = toastManager.add({
      title: '백그라운드에서 주간 리포트 발간을 시작했습니다.',
    });
    setTimeout(() => toastManager.close(toastId), 3000);

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
      handleFail();
    }
  };

  return (
    <>
      {/* 상태별 상단 버튼 */}
      {status === 'IDLE' || status === 'FAILED' ? (
        <button
          onClick={handleGenerate}
          className={`px-5 py-2.5 bg-white border text-sm font-medium rounded-lg flex items-center gap-2 tracking-widest transition-colors ${
            status === 'FAILED'
              ? 'border-red-300 text-red-600 hover:bg-red-50 hover:border-red-500'
              : 'border-surface-300 text-surface-700 hover:bg-surface-50 hover:border-black hover:text-black'
          }`}
        >
          {status === 'FAILED' && <AlertTriangle className="w-4 h-4" />}
          {status === 'FAILED' ? '주간 리포트 재발간' : '주간 리포트 발간'}
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
          maxWidth="max-w-3xl"
          trigger={
            <button 
              onClick={() => setOpen(true)}
              className="px-5 py-2.5 bg-white border-2 border-black text-black text-sm font-medium rounded-lg hover:bg-surface-50 tracking-widest transition-colors shadow-sm"
            >
              주간 리포트 확인
            </button>
          }
        >
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap gap-2 px-1">
              <span className="text-sm font-medium px-3 py-1.5 bg-surface-100 text-surface-700 rounded-md">대상: {recipientName} 어르신</span>
              <span className="text-sm font-medium px-3 py-1.5 bg-surface-100 text-surface-700 rounded-md">시기: {currentMonth}월 {currentWeekOfMonth}째주</span>
            </div>

            <div className="bg-[#FAFAFA] p-8 md:p-10 rounded-2xl border border-surface-200 shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)]">
              <div className="flex items-center gap-3 mb-6">
                <h3 className="text-base font-medium text-black tracking-widest">주간 리포트 내용</h3>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(report || '');
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex items-center text-surface-600 hover:text-black transition-colors"
                  title="리포트 복사"
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>
              <p className="text-surface-800 leading-[2.2] text-[1.05rem] whitespace-pre-wrap tracking-wide">
                {report || '내용이 없습니다.'}
              </p>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
