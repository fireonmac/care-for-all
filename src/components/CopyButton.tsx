'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Toast } from '@base-ui/react/toast';

export function CopyButton({ text, title = "복사하기", className }: { text: string, title?: string, className?: string }) {
  const [copied, setCopied] = useState(false);
  const toastManager = Toast.useToastManager();

  const handleCopy = () => {
    navigator.clipboard.writeText(text || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    const toastId = toastManager.add({
      title: '클립보드에 복사되었습니다. Ctrl + V로 붙여넣기하세요.',
      type: 'success',
    });
    setTimeout(() => toastManager.close(toastId), 3000);
  };

  return (
    <button
      onClick={handleCopy}
      className={className || "flex items-center text-surface-600 hover:text-black transition-colors"}
      title={title}
    >
      {copied ? <Check size={18} /> : <Copy size={18} />}
    </button>
  );
}
