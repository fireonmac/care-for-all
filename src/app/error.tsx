'use client';

import { useEffect } from 'react';

type ErrorPageProps = {
  error: Error & { digest?: string };
  unstable_retry: () => void;
};

export default function ErrorPage({
  error,
  unstable_retry,
}: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="max-w-5xl w-full mx-auto px-6 sm:px-12 pt-32 pb-24 min-h-screen">
      <section
        className="flex min-h-96 flex-col items-center justify-center border-y border-surface-200 px-6 text-center"
        role="alert"
      >
        <p className="mb-3 text-sm font-medium tracking-widest text-status-danger">
          불러오기 실패
        </p>
        <h1 className="mb-4 text-3xl font-medium tracking-tight text-black">
          어르신 목록을 불러오지 못했습니다.
        </h1>
        <p className="mb-8 text-surface-600">
          잠시 후 다시 시도해주세요.
        </p>
        <button
          type="button"
          onClick={unstable_retry}
          className="border border-black bg-black px-6 py-3 font-medium text-white transition-colors hover:bg-white hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
        >
          다시 시도
        </button>
      </section>
    </main>
  );
}
