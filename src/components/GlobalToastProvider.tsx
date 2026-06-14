'use client';

import { Toast } from '@base-ui/react/toast';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { ReactNode } from 'react';

export function GlobalToastProvider({ children }: { children: ReactNode }) {
  return (
    <Toast.Provider>
      {children}
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
      {toast.type === 'error' ? (
        <AlertCircle className="w-5 h-5 text-red-400" />
      ) : toast.type === 'success' ? (
        <CheckCircle2 className="w-5 h-5 text-status-success" />
      ) : null}
      <Toast.Content>
        <Toast.Title className={toast.type === 'error' ? 'text-red-400' : ''}>
          {toast.title}
        </Toast.Title>
      </Toast.Content>
    </Toast.Root>
  ));
}
