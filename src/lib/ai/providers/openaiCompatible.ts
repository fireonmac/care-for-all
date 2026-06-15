import type {
  TextGenerationProvider,
  TextGenerationRequest,
} from '@/lib/ai/types';

type OpenAiCompatibleResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

type OpenAiCompatibleChunk = {
  choices?: Array<{
    delta?: {
      content?: string;
    };
  }>;
};

export class OpenAiCompatibleProvider implements TextGenerationProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly model: string,
    private readonly apiKey?: string,
  ) {}

  async generateText(request: TextGenerationRequest): Promise<string> {
    const response = await this.request(request, false);
    const data = (await response.json()) as OpenAiCompatibleResponse;
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error('AI 공급자가 빈 응답을 반환했습니다.');
    }

    return content;
  }

  async streamText(
    request: TextGenerationRequest,
  ): Promise<ReadableStream<Uint8Array>> {
    const response = await this.request(request, true);

    if (!response.body) {
      throw new Error('AI 공급자의 스트리밍 응답 본문이 없습니다.');
    }

    let buffer = '';

    return response.body
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(
        new TransformStream<string, string>({
          transform(chunk, controller) {
            buffer += chunk;
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              enqueueOpenAiContent(line, controller);
            }
          },
          flush(controller) {
            enqueueOpenAiContent(buffer, controller);
          },
        }),
      )
      .pipeThrough(new TextEncoderStream());
  }

  private async request(
    request: TextGenerationRequest,
    stream: boolean,
  ): Promise<Response> {
    const headers = new Headers({ 'Content-Type': 'application/json' });

    if (this.apiKey) {
      headers.set('Authorization', `Bearer ${this.apiKey}`);
    }

    const response = await fetch(
      `${this.baseUrl.replace(/\/$/, '')}/chat/completions`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: this.model,
          messages: request.messages,
          stream,
          temperature: request.temperature,
          max_tokens: request.maxTokens,
        }),
        signal: AbortSignal.timeout(request.timeoutMs ?? 30_000),
      },
    );

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`AI 공급자 요청 실패 (${response.status}): ${detail}`);
    }

    return response;
  }
}

function enqueueOpenAiContent(
  line: string,
  controller: TransformStreamDefaultController<string>,
) {
  const normalizedLine = line.trim();
  if (!normalizedLine.startsWith('data:')) return;

  const payload = normalizedLine.slice(5).trim();
  if (!payload || payload === '[DONE]') return;

  const data = JSON.parse(payload) as OpenAiCompatibleChunk;
  const content = data.choices?.[0]?.delta?.content;

  if (content) {
    controller.enqueue(content);
  }
}
