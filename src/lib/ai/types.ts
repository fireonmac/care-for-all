export type AiMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type TextGenerationRequest = {
  messages: AiMessage[];
  temperature?: number;
  signal?: AbortSignal;
};

export interface TextGenerationProvider {
  generateText(request: TextGenerationRequest): Promise<string>;
  streamText(request: TextGenerationRequest): Promise<ReadableStream<Uint8Array>>;
}
