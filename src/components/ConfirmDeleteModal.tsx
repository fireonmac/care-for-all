'use client';

import { Modal, ModalClose } from '@/components/Modal';

interface ConfirmDeleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  onConfirm: () => void;
  isLoading?: boolean;
  trigger: React.ReactNode;
}

export function ConfirmDeleteModal({
  open,
  onOpenChange,
  title,
  message,
  onConfirm,
  isLoading = false,
  trigger,
}: ConfirmDeleteModalProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      trigger={trigger}
      footer={
        <>
          <ModalClose className="text-base font-medium tracking-widest text-black hover:text-surface-600">
            취소
          </ModalClose>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-6 py-2.5 bg-status-danger text-white text-base font-medium tracking-widest rounded-lg hover:bg-status-danger/90 disabled:opacity-50"
          >
            {isLoading ? '삭제 중...' : '삭제하기'}
          </button>
        </>
      }
    >
      <p className="text-black text-lg font-light leading-relaxed">{message}</p>
    </Modal>
  );
}
