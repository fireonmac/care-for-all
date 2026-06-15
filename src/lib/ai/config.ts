export type AiProviderName = 'ollama' | 'openai-compatible';

export type AiConfig = {
  provider: AiProviderName;
  model: string;
  baseUrl: string;
  apiKey?: string;
};

const PROVIDER_DEFAULTS: Record<AiProviderName, { baseUrl: string; model: string }> = {
  ollama: {
    baseUrl: 'http://127.0.0.1:11434',
    model: 'gemma4:26b',
  },
  'openai-compatible': {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4.1-mini',
  },
};

function getProviderName(): AiProviderName {
  const value = process.env.AI_PROVIDER ?? 'ollama';

  if (value === 'ollama' || value === 'openai-compatible') {
    return value;
  }

  throw new Error(
    `지원하지 않는 AI_PROVIDER입니다: ${value}. ollama 또는 openai-compatible을 사용하세요.`,
  );
}

export function getAiConfig(): AiConfig {
  const provider = getProviderName();
  const defaults = PROVIDER_DEFAULTS[provider];

  return {
    provider,
    model:
      process.env.AI_MODEL ??
      (provider === 'ollama' ? process.env.OLLAMA_MODEL : undefined) ??
      defaults.model,
    baseUrl:
      process.env.AI_BASE_URL ??
      (provider === 'ollama' ? process.env.OLLAMA_URL : undefined) ??
      defaults.baseUrl,
    apiKey: process.env.AI_API_KEY,
  };
}
