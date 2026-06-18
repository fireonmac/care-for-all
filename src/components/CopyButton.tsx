'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { Button } from '@/components/ui/button';

export function CopyButton({ text, title = "복사하기", className }: { text: string, title?: string, className?: string }) {
  const [copied, setCopied] = useState(false);
  const { showSuccess } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(text || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    showSuccess('클립보드에 복사되었습니다. Ctrl + V로 붙여넣기하세요.');
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleCopy}
      className={className || "text-muted-foreground hover:text-foreground hover:bg-muted/50 w-8 h-8"}
      title={title}
    >
      {copied ? <Check size={16} /> : <Copy size={16} />}
    </Button>
  );
}
