import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "데이터베이스 URL(DATABASE_URL)이 설정되지 않았습니다."),
  
  AI_PROVIDER: z.string().min(1, "AI 제공자(AI_PROVIDER)가 설정되지 않았습니다."),
  AI_MODEL: z.string().min(1, "AI 모델명(AI_MODEL)이 설정되지 않았습니다."),
  AI_BASE_URL: z.string().optional(),
  AI_API_KEY: z.string().optional(),

  BETTER_AUTH_SECRET: z.string().min(1, "Better Auth 비밀키(BETTER_AUTH_SECRET)가 설정되지 않았습니다."),
  BETTER_AUTH_URL: z.string().url("올바른 URL 형식의 BETTER_AUTH_URL이 필요합니다."),
  
  GOOGLE_CLIENT_ID: z.string().min(1, "구글 클라이언트 ID(GOOGLE_CLIENT_ID)가 설정되지 않았습니다."),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "구글 시크릿 키(GOOGLE_CLIENT_SECRET)가 설정되지 않았습니다."),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ 서버 환경변수(.env) 설정 오류:", parsedEnv.error.format());
  throw new Error("필수 환경변수가 누락되었거나 형식이 올바르지 않습니다. .env 파일을 확인해주세요.");
}

export const env = parsedEnv.data;
