'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

type WeeklyReportStatus = 'IDLE' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export function WeeklyReportSection({
  recipientId,
  weekStartDate,
}: {
  recipientId: string;
  weekStartDate: string;
}) {
  const [status, setStatus] = useState<WeeklyReportStatus>('IDLE');
  const [recordId, setRecordId] = useState<string | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. 처음 마운트 시 기존 작업 상태 확인
  useEffect(() => {
    checkInitialStatus();
    return () => stopPolling();
  }, [recipientId, weekStartDate]);

  const checkInitialStatus = async () => {
    try {
      // POST에 동일한 페이로드를 보내면 이미 존재하는 레코드를 반환함
      const res = await fetch('/api/generate-weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId, targetDate: weekStartDate }),
      });
      
      const data = await res.json();
      
      if (res.status === 200 && data.status === 'COMPLETED') {
        setStatus('COMPLETED');
        setRecordId(data.recordId);
        fetchContent(data.recordId);
      } else if (res.status === 202 && data.status === 'PROCESSING') {
        setStatus('PROCESSING');
        setRecordId(data.recordId);
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
      setContent(data.combinedContent);
    }
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const startPolling = (id: string) => {
    stopPolling(); // 중복 방지
    
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/records/${id}`);
        const data = await res.json();
        
        if (data.status === 'COMPLETED') {
          stopPolling();
          setStatus('COMPLETED');
          setContent(data.combinedContent);
        } else if (data.status === 'FAILED') {
          stopPolling();
          setStatus('FAILED');
        }
      } catch (error) {
        console.error('Polling error', error);
      }
    }, 3000); // 3초마다 상태 확인
  };

  const handleGenerate = async () => {
    setStatus('PROCESSING');
    try {
      const res = await fetch('/api/generate-weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId, targetDate: weekStartDate }),
      });
      const data = await res.json();
      
      if (data.recordId) {
        setRecordId(data.recordId);
        startPolling(data.recordId);
      }
    } catch (error) {
      setStatus('FAILED');
    }
  };

  return (
    <div className="mt-16 pt-16 border-t-2 border-surface-200">
      <div className="bg-surface-50 p-8 rounded-3xl border border-surface-200 flex flex-col items-center justify-center text-center gap-4">
        {status === 'IDLE' && (
          <>
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-surface-200 mb-2">
              <FileText className="w-8 h-8 text-surface-600" />
            </div>
            <h3 className="text-xl font-medium text-black">주간 요양보호 리포트</h3>
            <p className="text-surface-500 mb-4">이번 주 작성된 일일 관찰 일지를 종합하여<br/>보호자에게 전달할 리포트를 자동 생성합니다.</p>
            <button 
              onClick={handleGenerate}
              className="px-8 py-4 bg-black text-white text-base font-medium tracking-widest rounded-xl hover:bg-surface-800 transition-colors"
            >
              주간 리포트 발간 시작
            </button>
          </>
        )}

        {status === 'PROCESSING' && (
          <>
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-surface-200 mb-2">
              <Loader2 className="w-8 h-8 text-black animate-spin" />
            </div>
            <h3 className="text-xl font-medium text-black">리포트를 발간하고 있습니다</h3>
            <p className="text-surface-500">
              AI가 이번 주 기록들을 꼼꼼히 분석하고 종합합니다.<br/>
              <span className="text-black font-medium mt-2 block">페이지를 벗어나셔도 백그라운드에서 계속 진행됩니다!</span>
            </p>
          </>
        )}

        {status === 'COMPLETED' && (
          <>
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-surface-200 mb-2">
              <CheckCircle2 className="w-8 h-8 text-status-success" />
            </div>
            <h3 className="text-xl font-medium text-black">주간 리포트 발간 완료</h3>
            <p className="text-surface-500 mb-4">이번 주 종합 리포트가 완성되었습니다.</p>
            {content && (
              <div className="w-full text-left bg-white p-6 rounded-2xl border border-surface-200 text-black leading-relaxed mb-6">
                {content.split('\n').map((line, i) => (
                  <p key={i} className="min-h-[1.5rem]">{line}</p>
                ))}
              </div>
            )}
            <button 
              onClick={() => alert('프린트 또는 전송 기능 연결 예정')}
              className="px-8 py-4 border-2 border-black text-black text-base font-medium tracking-widest rounded-xl hover:bg-surface-50 transition-colors"
            >
              리포트 확인 및 공유
            </button>
          </>
        )}

        {status === 'FAILED' && (
          <>
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-surface-200 mb-2">
              <AlertCircle className="w-8 h-8 text-status-danger" />
            </div>
            <h3 className="text-xl font-medium text-black">리포트 발간 실패</h3>
            <p className="text-surface-500 mb-4">리포트를 생성하는 도중 오류가 발생했습니다.<br/>다시 시도해 주세요.</p>
            <button 
              onClick={handleGenerate}
              className="px-8 py-4 bg-black text-white text-base font-medium tracking-widest rounded-xl hover:bg-surface-800 transition-colors"
            >
              다시 시도
            </button>
          </>
        )}
      </div>
    </div>
  );
}
