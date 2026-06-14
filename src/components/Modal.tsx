'use client';

import { Dialog } from '@base-ui/react';
import { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: ReactNode;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
}

export function Modal({ open, onOpenChange, trigger, title, children, footer, maxWidth = 'max-w-md' }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger}
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-white/80 backdrop-blur-sm z-40" />
        <Dialog.Popup className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white w-[90vw] ${maxWidth} shadow-2xl z-50 outline-none border border-surface-200 rounded-xl flex flex-col max-h-[85vh] overflow-hidden`}>
          
          <div className="px-8 pt-8 pb-6 border-b border-surface-100 shrink-0 flex items-center justify-between">
            <Dialog.Title className="text-2xl font-medium text-black tracking-tight">
              {title}
            </Dialog.Title>
            <Dialog.Close className="text-surface-400 hover:text-black transition-colors rounded-lg p-1 hover:bg-surface-100 outline-none">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </Dialog.Close>
          </div>
          
          <div className="flex-1 overflow-y-auto p-8">
            {children}
          </div>
          
          {footer && (
            <div className="px-8 py-6 border-t border-surface-100 shrink-0 bg-white flex justify-end gap-6 items-center">
              {footer}
            </div>
          )}
          
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Dialog.Close 를 외부에서 쉽게 쓰도록 다시 export
export const ModalClose = Dialog.Close;
