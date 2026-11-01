import { z } from 'zod';
import { getAuthBaseUrl } from './lib/auth-url';

const authEnvSchema = z.object({
  ALLOWED_EMAILS: z.string().optional(),
  VERCEL: z.string().optional(),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.url(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
}).superRefine((config, context) => {
  if (config.VERCEL === '1' && !config.ALLOWED_EMAILS?.split(',').some((email) => email.trim())) {
    context.addIssue({ code: 'custom', path: ['ALLOWED_EMAILS'], message: 'Vercel에는 ALLOWED_EMAILS가 필요합니다.' });
  }
});

const aiEnvSchema = z.object({
  AI_PROVIDER: z.enum(['ollama', 'openai-compatible']),
  AI_MODEL: z.string().trim().min(1),
  AI_BASE_URL: z.url().refine((value) => /^https?:\/\//.test(value)).optional(),
  AI_API_KEY: z.string().optional(),
});

const databaseConfigSchema = z.object({
  url: z.string().min(1),
  authToken: z.string().trim().optional(),
}).superRefine((config, context) => {
  const local = config.url.startsWith('file:') || config.url === ':memory:';
  if (!local && !config.authToken) {
    context.addIssue({ code: 'custom', path: ['authToken'], message: '원격 DB에는 TURSO_AUTH_TOKEN이 필요합니다.' });
  }
});

// 각 소비자가 필요한 설정만 호출 시 검증한다. 모듈 import는 환경 검증을 실행하지 않는다.
export function getAuthEnv(environment: NodeJS.ProcessEnv = process.env) {
  const config = { ...environment, BETTER_AUTH_URL: getAuthBaseUrl({ BETTER_AUTH_URL: environment.BETTER_AUTH_URL, VERCEL: environment.VERCEL, VERCEL_URL: environment.VERCEL_URL }) };
  if (environment.SKIP_ENV_VALIDATION === '1' || environment.npm_lifecycle_event === 'build') {
    return config as unknown as z.infer<typeof authEnvSchema>;
  }
  const result = authEnvSchema.safeParse(config);
  if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`인증 환경변수 설정을 확인해주세요: ${fields}`);
  }
  return result.data;
}

export class AiConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiConfigurationError';
  }
}

export function getAiEnv(environment: NodeJS.ProcessEnv = process.env) {
  const result = aiEnvSchema.safeParse({ ...environment, AI_PROVIDER: environment.AI_PROVIDER?.trim() });
  if (!result.success) {
    const field = result.error.issues[0].path[0];
    throw new AiConfigurationError(`${String(field)} 설정이 필요하거나 올바르지 않습니다.`);
  }
  return result.data;
}

// 앱과 Drizzle Kit가 같은 검증을 사용하며 인증/AI 설정은 요구하지 않는다.
export function getDatabaseConfig(environment: NodeJS.ProcessEnv = process.env) {
  if (environment.VERCEL === '1' && !/^(libsql|https):\/\//.test(environment.DATABASE_URL ?? '')) {
    throw new Error('Vercel에는 원격 DATABASE_URL이 필요합니다. 로컬 SQLite 파일을 사용할 수 없습니다.');
  }
  return databaseConfigSchema.parse({
    url: environment.DATABASE_URL || 'file:./sqlite.db',
    authToken: environment.TURSO_AUTH_TOKEN || undefined,
  });
}
