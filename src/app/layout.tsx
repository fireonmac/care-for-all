import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "요양보호기록 관리",
  description: "어르신 요양보호기록 자동 작성 시스템",
};

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
        <header className="w-full border-b border-surface-200">
          <div className="max-w-5xl mx-auto px-6 sm:px-12 h-16 flex items-center">
            <span className="text-black font-semibold tracking-tight text-lg">고운마음시티케어</span>
          </div>
        </header>
        <div className="flex-1">
          {children}
        </div>
        <footer className="w-full border-t border-surface-100 py-12 mt-auto">
          <div className="max-w-5xl mx-auto px-6 sm:px-12 text-center">
            <span className="text-surface-400 text-sm tracking-widest font-light">고운마음시티주야간보호센터 | 박정원</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
