'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { WeeklyReportModal } from './WeeklyReportModal';
import {
  useWeeklyReportInitialQuery,
  useWeeklyRecordPollingQuery,
  useGenerateWeeklyReportMutation,
  useUpdateWeeklyRecordMutation, useDeleteWeeklyRecordMutation
} from './useWeeklyReportQueries';

const REPORT_BUTTON_CLASS = 'h-11 w-full px-2 sm:px-4';

interface WeeklyReportFormProps {
  recipientId: string;
  recipientName: string;
  currentMonth: number;
  currentWeekOfMonth: number;
  dailyRecordCount: number;
  weekStartDate: string;
  canGenerate: boolean;
}

export function WeeklyReportForm({
  recipientId,
  recipientName,
  currentMonth,
  currentWeekOfMonth,
  dailyRecordCount,
  weekStartDate,
  canGenerate,
}: WeeklyReportFormProps) {
  const [open, setOpen] = useState(false);
  const [generatedRecordId, setGeneratedRecordId] = useState<string | null>(null);
  const { showSuccess, showError, showInfo } = useToast();

  // --- Queries ---
  const initialQuery = useWeeklyReportInitialQuery(recipientId, weekStartDate);
  
  // generatedRecordId가 있으면 그것을 우선, 없으면 초기 쿼리에서 확인된 ID를 사용
  const activeRecordId = generatedRecordId || initialQuery.data?.recordId;
  const recordQuery = useWeeklyRecordPollingQuery(activeRecordId);

  // --- Mutations ---
  const generateMut = useGenerateWeeklyReportMutation();
  const updateMut = useUpdateWeeklyRecordMutation();
  const deleteMut = useDeleteWeeklyRecordMutation(recipientId, weekStartDate);

  // --- UI 상태 ---
  const isError = initialQuery.isError || recordQuery.isError;
  const isGenerating = generateMut.isPending;
  const serverStatus = recordQuery.data?.status || initialQuery.data?.status || 'IDLE';
  
  // UI 상태 도출 (가장 우선순위 높은 상태부터)
  const reportStatus = isError ? 'FAILED' : isGenerating ? 'PROCESSING' : serverStatus;
  const reportContent = recordQuery.data?.combinedContent || null;
  const reportLabel = `${currentMonth}월 ${currentWeekOfMonth}주차 주간 리포트`;

  // --- UI Side Effects ---
  const prevStatus = useRef(reportStatus);
  useEffect(() => {
    if (prevStatus.current === 'PROCESSING' && reportStatus === 'COMPLETED') {
      showSuccess('주간 리포트 발간이 완료되었습니다!');
    }
    if (prevStatus.current === 'PROCESSING' && reportStatus === 'FAILED') {
      showError('발간 작업 중 오류가 발생했습니다.');
    }
    prevStatus.current = reportStatus;
  }, [reportStatus, showSuccess, showError]);

  // --- Handlers ---
  const handleGenerate = () => {
    showInfo('백그라운드에서 주간 리포트 발간을 시작했습니다.');
    generateMut.mutate(
      { recipientId, targetDate: weekStartDate },
      {
        onSuccess: (data) => setGeneratedRecordId(data.recordId),
        onError: () => showError('발간 작업 중 오류가 발생했습니다.')
      }
    );
  };

  const handleSaveEdit = async (content: string) => {
    if (!activeRecordId) return;
    try {
      await updateMut.mutateAsync({ recordId: activeRecordId, content });
      showSuccess('성공적으로 수정되었습니다.');
    } catch {
      showError('수정에 실패했습니다.');
      throw new Error('Save failed'); // 모달이 실패를 인지하도록 에러를 던짐
    }
  };

  const handleDelete = async () => {
    if (!activeRecordId) return;
    try {
      await deleteMut.mutateAsync(activeRecordId);
      setGeneratedRecordId(null);
      setOpen(false);
      showSuccess('주간 리포트가 성공적으로 삭제되었습니다.');
    } catch {
      showError('삭제에 실패했습니다.');
    }
  };

  if (dailyRecordCount < 2 && !activeRecordId) return null;
  if (!canGenerate && (reportStatus === 'IDLE' || reportStatus === 'FAILED')) return null;

  return (
    <>
      {initialQuery.isLoading ? (
        <Button
          disabled
          aria-label={`${reportLabel} 불러오는 중`}
          variant="secondary"
          size="sm"
          className={`${REPORT_BUTTON_CLASS} bg-muted border-border text-muted-foreground cursor-wait`}
        >
          <Loader2 aria-hidden="true" className="hidden size-4 animate-spin sm:inline-block" />
          <span className="sm:hidden">로딩 중</span><span className="hidden sm:inline">로딩 중...</span>
        </Button>
      ) : reportStatus === 'IDLE' || reportStatus === 'FAILED' ? (
        <Button
          onClick={handleGenerate}
          variant="secondary"
          size="sm"
          className={`${REPORT_BUTTON_CLASS} ${reportStatus === 'FAILED' ? 'border-destructive/50 text-destructive hover:bg-destructive/10 hover:border-destructive' : ''}`}
          aria-label={`${reportLabel} ${reportStatus === 'FAILED' ? '재발간' : '발간'}`}
          disabled={isGenerating || !canGenerate}
        >
          {reportStatus === 'FAILED' && <AlertTriangle aria-hidden="true" className="hidden size-4 sm:inline-block" />}
          <span className="sm:hidden">{reportStatus === 'FAILED' ? '재발간' : '리포트'}</span>
          <span className="hidden sm:inline">{reportStatus === 'FAILED' ? '주간 리포트 재발간' : '주간 리포트 발간'}</span>
        </Button>
      ) : reportStatus === 'PROCESSING' ? (
        <Button
          disabled
          aria-label={`${reportLabel} 발간 중`}
          variant="secondary"
          size="sm"
          className={`${REPORT_BUTTON_CLASS} bg-muted border-border text-muted-foreground cursor-wait`}
        >
          <Loader2 aria-hidden="true" className="hidden size-4 animate-spin sm:inline-block" />
          <span className="sm:hidden">발간 중</span><span className="hidden sm:inline">발간 중...</span>
        </Button>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button variant="outline" size="sm" className={REPORT_BUTTON_CLASS} aria-label={`${reportLabel} 확인`} />}>
            <span className="sm:hidden">리포트</span><span className="hidden sm:inline">주간 리포트 확인</span>
          </DialogTrigger>
          <WeeklyReportModal
            recipientName={recipientName}
            currentMonth={currentMonth}
            currentWeekOfMonth={currentWeekOfMonth}
            reportContent={reportContent}
            onSaveEdit={handleSaveEdit}
            isSavingEdit={updateMut.isPending}
            onDelete={handleDelete}
            isDeleting={deleteMut.isPending}
            canEdit={recordQuery.data?.canEdit ?? initialQuery.data?.canEdit ?? false}
          />
        </Dialog>
      )}
    </>
  );
}
