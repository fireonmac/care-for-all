import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getLoginErrorMessage } from './errors';
import Image from "next/image";
import { LoginButton } from "./_components/LoginButton";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string | string[] }> }) {
  const session = await getSession();
  if (session) redirect('/');
  const errorMessage = getLoginErrorMessage((await searchParams).error);
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
        <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-3">
          케어포올 시작하기
        </h1>
        <p className="text-foreground/80 text-base mb-12 leading-relaxed">
          어르신 요양보호기록 작성을<br />AI와 함께 더욱 쉽고 빠르게 진행하세요.
        </p>
        
        {errorMessage && <p role="alert" className="mb-4 text-destructive">{errorMessage}</p>}
        <LoginButton />

        <p className="mt-8 text-sm text-muted-foreground leading-relaxed font-light">
          계속 진행하면 케어포올의 서비스 이용약관 및<br />개인정보 처리방침에 동의한 것으로 간주됩니다.
        </p>
      </div>
    </div>
  );
}
