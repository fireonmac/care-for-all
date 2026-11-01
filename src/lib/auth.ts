import { betterAuth } from 'better-auth';
import { APIError } from 'better-auth/api';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { user as users } from '@/db/schema';
import { getAuthEnv } from '@/env';
import { isAllowedUser } from '@/lib/access';

const env = getAuthEnv();
const isPermitted = (user: Pick<typeof users.$inferSelect, 'email' | 'emailVerified'>) =>
  isAllowedUser(user, env.ALLOWED_EMAILS, env.requireAllowlist);

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: 'sqlite' }),
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (!isPermitted(user)) throw new APIError('FORBIDDEN', { message: '허용된 계정으로 로그인해주세요.' });
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          const user = await db.query.user.findFirst({ where: eq(users.id, session.userId) });
          if (!user || !isPermitted(user)) throw new APIError('FORBIDDEN', { message: '허용된 계정으로 로그인해주세요.' });
        },
      },
    },
  },
});

export async function getSession() {
  // 빌드 검증 생략 설정에서도 공개 배포는 허용 목록이 없으면 차단한다.
  if (env.requireAllowlist && !env.ALLOWED_EMAILS?.split(',').some((email) => email.trim())) return null;
  const session = await auth.api.getSession({ headers: await headers() });
  return session && isPermitted(session.user) ? session : null;
}

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect('/login');
  return session;
}
