'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Modal, ModalClose } from '@/components/Modal';
import { Textarea } from '@/components/Textarea';
import { AlertTriangle, Loader2, Pencil, Trash2 } from 'lucide-react';
import { deleteRecord, updateWeeklyRecord } from './actions';
import { CopyButton } from '@/components/CopyButton';
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal';
import { useToast } from '@/hooks/useToast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [generatedRecordId, setGeneratedRecordId] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const { showSuccess, showError, showInfo } = useToast();
  const queryClient = useQueryClient();

  // 1. 초기 상태 확인
  const { data: initialData } = useQuery({
    queryKey: ['weeklyReportInitial', recipientId, weekStartDate],
    queryFn: async () => {
      const res = await fetch(`/api/generate-weekly?recipientId=${recipientId}&targetDate=${weekStartDate}`, { cache: 'no-store' });
      return res.json();
    },
    enabled: !!weekStartDate,
  });

  const activeRecordId = generatedRecordId || initialData?.recordId;

  // 2. 레코드 상세 조회 및 폴링 (선언적)
  const { data: recordData, isError: recordError } = useQuery({
    queryKey: ['weeklyRecord', activeRecordId],
    queryFn: async () => {
      const res = await fetch(`/api/records/${activeRecordId}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Fetch failed');
      return res.json();
    },
    refetchInterval: (query) => {
      return query.state.data?.status === 'PROCESSING' ? 3000 : false;
    },
    enabled: !!activeRecordId,
  });

  // 상태 파생 (Derived State)
  let status: 'IDLE' | 'PROCESSING' | 'COMPLETED' | 'FAILED' = 'IDLE';

  if (recordData) {
    if (recordData.status === 'COMPLETED') status = 'COMPLETED';
    else if (recordData.status === 'FAILED') status = 'FAILED';
    else if (recordData.status === 'PROCESSING') status = 'PROCESSING';
  } else if (initialData) {
    if (initialData.status === 'FAILED') status = 'FAILED';
    else if (initialData.status === 'PROCESSING') status = 'PROCESSING';
  }

  if (recordError) status = 'FAILED';

  // 3. 발간 상태 변화 감지 및 토스트
  const prevStatus = useRef(status);
  useEffect(() => {
    if (prevStatus.current === 'PROCESSING' && status === 'COMPLETED') {
      showSuccess('주간 리포트 발간이 완료되었습니다!');
    }
    if (prevStatus.current === 'PROCESSING' && status === 'FAILED') {
      showError('발간 작업 중 오류가 발생했습니다.');
    }
    prevStatus.current = status;
  }, [status, showSuccess, showError]);

  // 4. 발간 트리거 (Mutation)
  const { mutate: generateReport, isPending: isGenerating } = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/generate-weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId, targetDate: weekStartDate }),
      });
      const data = await res.json();
      if (!data.recordId) throw new Error('No recordId');
      return data;
    },
    onMutate: () => showInfo('백그라운드에서 주간 리포트 발간을 시작했습니다.'),
    onSuccess: (data) => setGeneratedRecordId(data.recordId),
    onError: () => showError('발간 작업 중 오류가 발생했습니다.')
  });

  if (isGenerating) status = 'PROCESSING';

  const reportContent = recordData?.combinedContent || null;

  const handleEditClick = () => {
    setEditContent(reportContent || '');
    setIsEditing(true);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = textareaRef.current.value.length;
        textareaRef.current.selectionEnd = textareaRef.current.value.length;
      }
    }, 0);
  };

  const { mutate: saveEdit, isPending: isSavingEdit } = useMutation({
    mutationFn: () => {
      if (!activeRecordId) throw new Error('No active record ID');
      return updateWeeklyRecord(activeRecordId, editContent);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeklyRecord', activeRecordId] });
      setIsEditing(false);
      showSuccess('성공적으로 수정되었습니다.');
      router.refresh();
    },
    onError: () => showError('수정에 실패했습니다.')
  });

  const { mutate: handleDeleteRecord, isPending: isDeleting } = useMutation({
    mutationFn: () => {
      if (!activeRecordId) throw new Error('No active record ID');
      return deleteRecord(activeRecordId);
    },
    onSuccess: () => {
      setGeneratedRecordId(null);
      queryClient.invalidateQueries({ queryKey: ['weeklyReportInitial', recipientId, weekStartDate] });
      setOpen(false);
      setDeleteModalOpen(false);
      showSuccess('주간 리포트가 성공적으로 삭제되었습니다.');
      router.refresh();
    },
    onError: () => showError('삭제에 실패했습니다.')
  });

  if (dailyRecordCount < 2) return null;

  return (
    <>
      {status === 'IDLE' || status === 'FAILED' ? (
        <button
          onClick={() => generateReport()}
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
                  {!isEditing && <CopyButton text={reportContent || ''} title="리포트 복사" />}
                </div>
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <button onClick={() => setIsEditing(false)} className="text-sm font-medium tracking-widest text-surface-500 hover:text-black px-3 py-1.5 transition-colors">취소</button>
                      <button onClick={() => saveEdit()} disabled={isSavingEdit} className="bg-black text-white text-sm font-medium tracking-widest px-4 py-1.5 rounded-md hover:bg-surface-800 disabled:opacity-50">
                        {isSavingEdit ? '저장 중...' : '저장'}
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
                        onConfirm={() => handleDeleteRecord()}
                        isLoading={isDeleting}
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
                    {reportContent || '내용이 없습니다.'}
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
