'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Modal, ModalClose } from '@/components/Modal';
import { Textarea } from '@/components/Textarea';
import { AlertTriangle, Loader2, Pencil, Trash2 } from 'lucide-react';
import { deleteRecord, updateWeeklyRecord } from './actions';
import { CopyButton } from '@/components/CopyButton';
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal';
import { useToast } from '@/hooks/useToast';

interface WeeklyReportFormProps {
  recipientId: string;
  recipientName: string;
  currentMonth: number;
  currentWeekOfMonth: number;
  dailyRecordCount: number;
  weekStartDate: string;
}

export function WeeklyReportForm({
  recipientId,
  recipientName,
  currentMonth,
  currentWeekOfMonth,
  dailyRecordCount,
  weekStartDate,
}: WeeklyReportFormProps) {
  const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'COMPLETED' | 'FAILED'>('IDLE');
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const { showSuccess, showError, showInfo } = useToast();

  const fetchContent = useCallback(async (id: string) => {
    const res = await fetch(`/api/records/${id}`);
    const data = await res.json();
    if (data.combinedContent) {
      setReport(data.combinedContent);
    }
  }, []);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const handleFail = useCallback(() => {
    stopPolling();
    setStatus('FAILED');
    showError('발간 작업 중 오류가 발생했습니다.');
  }, [stopPolling, showError]);

  const startPolling = useCallback((id: string) => {
    stopPolling();
    pollingIntervalRef.current = setInterval(async () => {
      try {
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
          setRecordId(id);
          setReport(data.combinedContent);
          showSuccess('주간 리포트 발간이 완료되었습니다!');
        } else if (data.status === 'FAILED') {
          handleFail();
        }
      } catch (error) {
        console.error('Polling error', error);
        handleFail();
      }
    }, 3000);
  }, [handleFail, stopPolling, showSuccess]);

  useEffect(() => {
    if (!weekStartDate) return;

    const checkInitialStatus = async () => {
      try {
        const res = await fetch(`/api/generate-weekly?recipientId=${recipientId}&targetDate=${weekStartDate}`, { cache: 'no-store' });
        const data = await res.json();

        if (data.status === 'COMPLETED' && data.recordId) {
          setStatus('COMPLETED');
          setRecordId(data.recordId);
          void fetchContent(data.recordId);
        } else if (data.status === 'PROCESSING' && data.recordId) {
          setStatus('PROCESSING');
          startPolling(data.recordId);
        } else if (data.status === 'FAILED') {
          setStatus('FAILED');
        } else {
          setStatus('IDLE');
        }
      } catch {
        setStatus('IDLE');
      }
    };

    void checkInitialStatus();
    return stopPolling;
  }, [fetchContent, recipientId, startPolling, stopPolling, weekStartDate]);

  const handleGenerate = async () => {
    setStatus('PROCESSING');
    showInfo('백그라운드에서 주간 리포트 발간을 시작했습니다.');

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
    } catch {
      handleFail();
    }
  };

  const handleEditClick = () => {
    setEditContent(report || '');
    setIsEditing(true);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = textareaRef.current.value.length;
        textareaRef.current.selectionEnd = textareaRef.current.value.length;
      }
    }, 0);
  };

  const handleEditSave = async () => {
    if (!recordId) return;
    setSaving(true);
    try {
      await updateWeeklyRecord(recordId, editContent);
      setReport(editContent);
      setIsEditing(false);
      showSuccess('성공적으로 수정되었습니다.');
      router.refresh();
    } catch {
      showError('수정에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!recordId) return;
    setSaving(true);
    try {
      await deleteRecord(recordId);
      setStatus('IDLE');
      setOpen(false);
      setDeleteModalOpen(false);
      showSuccess('주간 리포트가 성공적으로 삭제되었습니다.');
      router.refresh();
    } catch {
      showError('삭제에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // 일일 기록이 2개 미만이면 버튼 자체를 표시하지 않음
  if (dailyRecordCount < 2) return null;

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
          maxHeight="max-h-[70vh]"
          bodyClassName="p-8 pb-12 min-h-[300px]"
          trigger={
            <button
              onClick={() => setOpen(true)}
              className="px-5 py-2.5 bg-white border-2 border-black text-black text-sm font-medium rounded-lg hover:bg-surface-50 tracking-widest transition-colors shadow-sm"
            >
              주간 리포트 확인
            </button>
          }
        >
          <div className="flex flex-col gap-8">
            <div className="px-1">
              <p className="text-xl font-medium text-black tracking-tight">{recipientName} 어르신</p>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3 mb-4 px-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-medium text-black tracking-widest">{currentMonth}월 {currentWeekOfMonth}째주 내용</h3>
                  {!isEditing && <CopyButton text={report || ''} title="리포트 복사" />}
                </div>
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <button onClick={() => setIsEditing(false)} className="text-sm font-medium tracking-widest text-surface-500 hover:text-black px-3 py-1.5 transition-colors">취소</button>
                      <button onClick={handleEditSave} disabled={saving} className="bg-black text-white text-sm font-medium tracking-widest px-4 py-1.5 rounded-md hover:bg-surface-800 disabled:opacity-50">
                        {saving ? '저장 중...' : '저장'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={handleEditClick} className="flex items-center gap-1.5 text-sm font-medium tracking-widest text-black hover:bg-surface-50 bg-white border border-surface-300 px-3 py-1.5 rounded-md transition-colors">
                        <Pencil size={14} /> <span>수정</span>
                      </button>
                      <ConfirmDeleteModal
                        open={deleteModalOpen}
                        onOpenChange={setDeleteModalOpen}
                        title="주간 리포트 삭제"
                        message="정말 이 주간 리포트를 삭제하시겠습니까? 삭제된 리포트는 복구할 수 없습니다."
                        onConfirm={handleDelete}
                        isLoading={saving}
                        trigger={
                          <button onClick={() => setDeleteModalOpen(true)} className="flex items-center gap-1.5 text-sm font-medium tracking-widest text-black hover:bg-surface-50 hover:text-status-danger bg-white border border-surface-300 px-3 py-1.5 rounded-md transition-colors">
                            <Trash2 size={14} /> <span>삭제</span>
                          </button>
                        }
                      />
                    </>
                  )}
                </div>
              </div>

              {isEditing ? (
                <Textarea
                  ref={textareaRef}
                  className="w-full min-h-[400px] text-[1.05rem] leading-[2.2] tracking-wide text-surface-800 resize-none p-6 md:p-8"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                />
              ) : (
                <div className="bg-[#FAFAFA] p-6 md:p-8 rounded-2xl border border-surface-200 shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)] min-h-[200px]">
                  <p className="text-surface-800 leading-[2.2] text-[1.05rem] whitespace-pre-wrap tracking-wide">
                    {report || '내용이 없습니다.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
