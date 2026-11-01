import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  // 빠른 화면 이동만 담당한다. 실제 세션/권한 검사는 모든 데이터 조회에서 수행한다.
  const hasSession = request.cookies.has('better-auth.session_token') ||
    request.cookies.has('__Secure-better-auth.session_token');
  if (!hasSession) return NextResponse.redirect(new URL('/login', request.url));
  return NextResponse.next();
}

export const config = { matcher: ['/', '/recipients/:path*'] };
