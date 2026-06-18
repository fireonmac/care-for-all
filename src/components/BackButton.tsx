'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function BackButton({ href, label, onClick }: { href?: string, label: string, onClick?: () => void }) {
  const router = useRouter();
  
  const content = (
    <>
      <span className="text-xl leading-none -mt-0.5">←</span>
      <span>{label}</span>
    </>
  );

  const className = "inline-flex items-center gap-2 text-base font-medium tracking-widest text-muted-foreground hover:text-foreground transition-colors";

  return (
    <div className="mb-14">
      {href ? (
        <Link href={href} className={className}>
          {content}
        </Link>
      ) : (
        <Button variant="link" onClick={onClick || (() => router.back())} className="p-0 h-auto text-muted-foreground hover:text-foreground">
          {content}
        </Button>
      )}
    </div>
  );
}
