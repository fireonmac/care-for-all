import { useState, useRef } from 'react';
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Trash2 } from 'lucide-react';
import { CopyButton } from '@/components/CopyButton';
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal';

interface WeeklyReportModalProps {
  recipientName: string;
  currentMonth: number;
  currentWeekOfMonth: number;
  reportContent: string | null;
  onSaveEdit: (content: string) => Promise<void>;
  isSavingEdit: boolean;
  onDelete: () => void;
  isDeleting: boolean;
  onClose: () => void;
}

export function WeeklyReportModal({
  recipientName,
  currentMonth,
  currentWeekOfMonth,
  reportContent,
  onSaveEdit,
  isSavingEdit,
  onDelete,
  isDeleting,
  onClose,
}: WeeklyReportModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const handleSave = async () => {
    try {
      await onSaveEdit(editContent);
      setIsEditing(false);
    } catch (e) {
      // Error handled by the hook
    }
  };

  return (
    <DialogContent className="max-w-4xl sm:max-w-4xl max-h-[70vh]">
      <DialogHeader>
        <DialogTitle>주간 요양보호기록 종합</DialogTitle>
      </DialogHeader>

      <DialogBody className="pb-12 min-h-75">
        <div className="flex flex-col gap-8">
          <div className="px-1">
            <p className="text-xl font-medium text-foreground tracking-tight">{recipientName} 어르신</p>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3 mb-4 px-1">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-medium text-foreground tracking-widest">{currentMonth}월 {currentWeekOfMonth}째주 내용</h3>
                {!isEditing && <CopyButton text={reportContent || ''} title="리포트 복사" />}
              </div>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <Button onClick={() => setIsEditing(false)} variant="ghost" size="xs">취소</Button>
                    <Button onClick={handleSave} disabled={isSavingEdit} size="xs" className="px-4">
                      {isSavingEdit ? '저장 중...' : '저장'}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button onClick={handleEditClick} variant="secondary" size="xs">
                      <Pencil size={14} /> <span>수정</span>
                    </Button>
                    <ConfirmDeleteModal
                      open={deleteModalOpen}
                      onOpenChange={setDeleteModalOpen}
                      title="주간 리포트 삭제"
                      message="정말 이 주간 리포트를 삭제하시겠습니까? 삭제된 리포트는 복구할 수 없습니다."
                      onConfirm={onDelete}
                      isLoading={isDeleting}
                      trigger={
                        <Button onClick={() => setDeleteModalOpen(true)} variant="secondary" size="xs" className="hover:text-destructive">
                          <Trash2 size={14} /> <span>삭제</span>
                        </Button>
                      }
                    />
                  </>
                )}
              </div>
            </div>

            {isEditing ? (
              <Textarea
                ref={textareaRef}
                className="w-full min-h-100 text-[1.05rem] leading-[2.2] tracking-wide text-foreground resize-none p-6 md:p-8"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
              />
            ) : (
              <div className="bg-muted p-6 md:p-8 rounded-2xl border border-border shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)] min-h-[200px]">
                <p className="text-foreground leading-[2.2] text-[1.05rem] whitespace-pre-wrap tracking-wide">
                  {reportContent || '내용이 없습니다.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogBody>
    </DialogContent>
  );
}
