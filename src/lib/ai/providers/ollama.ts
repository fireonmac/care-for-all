import type {
  TextGenerationProvider,
  TextGenerationRequest,
} from '@/lib/ai/types';

type OllamaChunk = {
  message?: {
    content?: string;
  };
};

export class OllamaProvider implements TextGenerationProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly model: string,
  ) {}

  async generateText(request: TextGenerationRequest): Promise<string> {
    const response = await this.request(request, false);
    const data = (await response.json()) as OllamaChunk;
    const content = data.message?.content?.trim();

    if (!content) {
      throw new Error('Ollama가 빈 응답을 반환했습니다.');
    }

    return content;
  }

  async streamText(
    request: TextGenerationRequest,
  ): Promise<ReadableStream<Uint8Array>> {
    const response = await this.request(request, true);

    if (!response.body) {
      throw new Error('Ollama 스트리밍 응답 본문이 없습니다.');
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
              enqueueOllamaContent(line, controller);
            }
          },
          flush(controller) {
            enqueueOllamaContent(buffer, controller);
          },
        }),
      )
      .pipeThrough(new TextEncoderStream());
  }

  private async request(
    request: TextGenerationRequest,
    stream: boolean,
  ): Promise<Response> {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: request.messages,
        think: false,
        stream,
        keep_alive: '10m',
        options: {
          num_ctx: 4096,
          num_predict: request.maxTokens,
          temperature: request.temperature,
        },
      }),
      signal: AbortSignal.timeout(request.timeoutMs ?? 30_000),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Ollama 요청 실패 (${response.status}): ${detail}`);
    }

    return response;
  }
}

function enqueueOllamaContent(
  line: string,
  controller: TransformStreamDefaultController<string>,
) {
  if (!line.trim()) return;

  const data = JSON.parse(line) as OllamaChunk;
  const content = data.message?.content;

  if (content) {
    controller.enqueue(content);
  }
}
