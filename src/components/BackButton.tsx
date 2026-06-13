'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function BackButton({ href, label, onClick }: { href?: string, label: string, onClick?: () => void }) {
  const router = useRouter();
  
  const content = (
    <>
      <span className="text-xl leading-none -mt-0.5">←</span>
      <span>{label}</span>
    </>
  );

  const className = "inline-flex items-center gap-2 text-base font-medium tracking-widest text-surface-500 hover:text-black transition-colors";

  return (
    <div className="mb-20">
      {href ? (
        <Link href={href} className={className}>
          {content}
        </Link>
      ) : (
        <button onClick={onClick || (() => router.back())} className={className}>
          {content}
        </button>
      )}
    </div>
  );
}
