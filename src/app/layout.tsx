import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "케어포올",
  description: "어르신 요양보호기록 자동 작성 시스템",
};

import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { GlobalToastProvider } from '@/components/GlobalToastProvider';
import { QueryProvider } from '@/components/QueryProvider';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link rel="stylesheet" as="style" crossOrigin="anonymous" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css" />
      </head>
      <body className="min-h-full flex flex-col tracking-tight bg-white text-black">
        <GlobalToastProvider>
          <QueryProvider>
            <NuqsAdapter>{children}</NuqsAdapter>
          </QueryProvider>
        </GlobalToastProvider>
      </body>
    </html>
  );
}
