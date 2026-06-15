import { getAiConfig } from '@/lib/ai/config';
import { OllamaProvider } from '@/lib/ai/providers/ollama';
import { OpenAiCompatibleProvider } from '@/lib/ai/providers/openaiCompatible';
import type { TextGenerationProvider } from '@/lib/ai/types';

export function createTextGenerationProvider(): TextGenerationProvider {
  const config = getAiConfig();

  switch (config.provider) {
    case 'ollama':
      return new OllamaProvider(config.baseUrl, config.model);
    case 'openai-compatible':
      return new OpenAiCompatibleProvider(
        config.baseUrl,
        config.model,
        config.apiKey,
      );
  }
}
