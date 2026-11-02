import type {
  TextGenerationProvider,
  TextGenerationRequest,
} from '@/lib/ai/types';

type OpenAiCompatibleResponse = {
  error?: unknown;
  choices?: Array<{
    finish_reason?: string | null;
    message?: {
      content?: string;
    };
  }>;
};

type OpenAiCompatibleChunk = {
  error?: unknown;
  choices?: Array<{
    finish_reason?: string | null;
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
    assertCompletedResponse(data);
    if (data.choices?.[0]?.finish_reason !== 'stop') {
      throw new Error('AI 응답이 완성되지 않았습니다. 다시 생성해주세요.');
    }
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
    const completion = { stopped: false, hasContent: false };

    return response.body
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(
        new TransformStream<string, string>({
          transform(chunk, controller) {
            buffer += chunk;
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              enqueueOpenAiContent(line, controller, completion);
            }
          },
          flush(controller) {
            enqueueOpenAiContent(buffer, controller, completion);
            if (!completion.stopped || !completion.hasContent) {
              throw new Error('AI 스트림이 완성되지 않았습니다. 다시 생성해주세요.');
            }
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
        }),
        signal: request.signal,
      },
    );

    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`AI 공급자 요청 실패 (${response.status})`);
    }

    return response;
  }
}

function enqueueOpenAiContent(
  line: string,
  controller: TransformStreamDefaultController<string>,
  completion: { stopped: boolean; hasContent: boolean },
) {
  const normalizedLine = line.trim();
  if (!normalizedLine.startsWith('data:')) return;

  const payload = normalizedLine.slice(5).trim();
  if (!payload) return;
  if (payload === '[DONE]') {
    if (!completion.stopped) throw new Error('AI 스트림이 정상 종료되지 않았습니다.');
    return;
  }

  const data = JSON.parse(payload) as OpenAiCompatibleChunk;
  assertCompletedResponse(data);
  const choice = data.choices?.[0];
  const content = choice?.delta?.content;
  if (choice?.finish_reason === 'stop') completion.stopped = true;

  if (content) {
    completion.hasContent ||= Boolean(content.trim());
    controller.enqueue(content);
  }
}

function assertCompletedResponse(data: OpenAiCompatibleResponse | OpenAiCompatibleChunk) {
  if (data.error) throw new Error('AI 공급자가 오류 응답을 반환했습니다.');
  const reason = data.choices?.[0]?.finish_reason;
  if (reason === 'length') {
    throw new Error('AI 생성 한도에 도달하여 기록이 중단됐습니다. 다시 생성해주세요.');
  }
  if (reason === 'content_filter') {
    throw new Error('AI 공급자의 안전 필터로 기록 생성이 중단됐습니다.');
  }
  if (reason && reason !== 'stop') {
    throw new Error('AI 응답이 완성되지 않았습니다. 다시 생성해주세요.');
  }
}
