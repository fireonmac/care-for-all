import { getAiEnv } from '@/env';
export { AiConfigurationError } from '@/env';

export type AiProviderName = ReturnType<typeof getAiEnv>['AI_PROVIDER'];
export type AiConfig = ReturnType<typeof getAiConfig>;

const PROVIDER_BASE_URLS: Record<AiProviderName, string> = {
  ollama: 'http://127.0.0.1:11434',
  'openai-compatible': 'https://api.openai.com/v1',
};

export function getAiConfig() {
  const env = getAiEnv();
  return {
    provider: env.AI_PROVIDER,
    model: env.AI_MODEL,
    baseUrl: env.AI_BASE_URL ?? PROVIDER_BASE_URLS[env.AI_PROVIDER],
    apiKey: env.AI_API_KEY,
  };
}
