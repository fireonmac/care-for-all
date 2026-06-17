"use client";

import { authClient } from "@/lib/auth-client";
import Image from "next/image";

export default function LoginPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm flex flex-col items-center text-center -mt-16">
        <Image
          src="/brand/care-for-all-logo-placeholder.png"
          alt="케어포올 로고"
          width={56}
          height={56}
          className="mb-8"
        />
        <h1 className="text-3xl font-semibold tracking-tight text-black mb-3">
          케어포올 시작하기
        </h1>
        <p className="text-surface-700 text-base mb-12 leading-relaxed">
          어르신 요양보호기록 작성을<br />AI와 함께 더욱 쉽고 빠르게 진행하세요.
        </p>
        
        <button
          onClick={async () => {
            await authClient.signIn.social({ provider: "google", callbackURL: "/" });
          }}
          className="flex items-center justify-center gap-3 px-6 py-4 text-base font-medium text-black bg-white border border-surface-200 hover:bg-surface-50 transition-colors rounded-2xl w-full"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5 shrink-0">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          <span>Google 계정으로 로그인</span>
        </button>

        <p className="mt-8 text-sm text-surface-600 leading-relaxed font-light">
          계속 진행하면 케어포올의 서비스 이용약관 및<br />개인정보 처리방침에 동의한 것으로 간주됩니다.
        </p>
      </div>
    </div>
  );
}
