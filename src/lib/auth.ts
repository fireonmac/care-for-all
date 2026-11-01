import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { getAuthEnv } from '@/env';

const env = getAuthEnv();

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: 'sqlite', schema, transaction: false }),
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  onAPIError: { errorURL: `${env.BETTER_AUTH_URL}/login` },
});

// 인증은 Google 계정의 세션만 확인한다. 공유 자료/AI 권한은 호출부에서 별도 검사한다.
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect('/login');
  return session;
}
