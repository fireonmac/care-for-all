import Image from "next/image";
import Link from 'next/link';
import { AuthButton } from '@/components/AuthButton';

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <header className="fixed top-0 w-full border-b border-border bg-background/80 backdrop-blur-md z-50">
        <div className="max-w-5xl mx-auto px-6 sm:px-12 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-foreground hover:opacity-70 transition-opacity"
          >
            <Image
              src="/brand/care-for-all-logo-placeholder.png"
              alt="케어포올"
              width={36}
              height={36}
              priority
            />
            <span className="text-2xl tracking-tight">케어포올</span>
          </Link>
          <AuthButton />
        </div>
      </header>
      <div className="flex-1 mt-16">
        {children}
      </div>
      <footer className="w-full border-t border-border pt-6 pb-8 mt-24">
        <div className="max-w-5xl mx-auto px-6 sm:px-12 text-center">
          <span className="text-muted-foreground text-sm tracking-widest font-light">고운마음시티주야간보호센터 <span className="opacity-30">|</span> 박정원</span>
        </div>
      </footer>
    </>
  );
}
