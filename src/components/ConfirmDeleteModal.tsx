'use client';

import { useRef, type ReactElement, type ComponentProps } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger, DialogBody, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ConfirmDeleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  onConfirm: () => void;
  isLoading?: boolean;
  trigger?: ReactElement;
  error?: string;
  finalFocus?: ComponentProps<typeof DialogContent>['finalFocus'];
}

export function ConfirmDeleteModal({
  open,
  onOpenChange,
  title,
  message,
  onConfirm,
  isLoading = false,
  trigger, error, finalFocus,
}: ConfirmDeleteModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <Dialog open={open} onOpenChange={value => { if (!isLoading) onOpenChange(value); }}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent initialFocus={cancelRef} finalFocus={finalFocus} className="w-[calc(100%_-_2rem)] rounded-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <DialogBody>
          <DialogDescription className="text-muted-foreground text-base leading-relaxed whitespace-pre-line">{message}</DialogDescription>
          {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
        </DialogBody>

        <DialogFooter showCloseButton={false} className="flex-col gap-3 sm:flex-row">
          <Button ref={cancelRef} type="button" variant="secondary" className="w-full sm:w-auto" disabled={isLoading} onClick={() => onOpenChange(false)}>취소</Button>
          <Button
            type="button"
            variant="destructive"
            className="w-full sm:w-auto"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? '삭제 중...' : '삭제하기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
