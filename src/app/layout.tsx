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
        <header className="fixed top-0 w-full border-b border-surface-200 bg-white/80 backdrop-blur-md z-50">
          <div className="max-w-5xl mx-auto px-6 sm:px-12 h-16 flex items-center">
            <span className="text-black font-semibold tracking-tight text-lg">스마트 요양일지</span>
          </div>
        </header>
        <div className="flex-1 mt-16">
          {children}
        </div>
        <footer className="w-full border-t border-surface-100 pt-6 pb-8 mt-24">
          <div className="max-w-5xl mx-auto px-6 sm:px-12 text-center">
            <span className="text-surface-600 text-sm tracking-widest font-light">고운마음시티주야간보호센터 | 박정원</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
