import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceLoader } from './load-source.mjs';

const load = sourceLoader();
const { OpenAiCompatibleProvider } = load('src/lib/ai/providers/openaiCompatible.ts');
const { OllamaProvider } = load('src/lib/ai/providers/ollama.ts');
const base = 'https://generativelanguage.googleapis.com/v1beta/openai';
const provider = () => new OpenAiCompatibleProvider(base, 'synthetic-model', 'synthetic-key');
const request = { messages: [{ role: 'user', content: '합성 관찰: 색종이를 접음.' }] };
const text = (stream) => new Response(stream).text();

test('Gemini-compatible request keeps results without an app token cap or timer', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, base + '/chat/completions');
    assert.equal(options.headers.get('Authorization'), 'Bearer synthetic-key');
    const body = JSON.parse(options.body);
    assert.equal(body.model, 'synthetic-model'); assert.equal(Object.hasOwn(body, 'max_tokens'), false);
    assert.equal(Object.hasOwn(body, 'reasoning_effort'), false);
    assert.equal(body.stream, false); assert.deepEqual(body.messages, request.messages);
    assert.equal(options.signal, undefined);
    return Response.json({ choices: [{ message: { content: ' 합성 결과 ' }, finish_reason: 'stop' }] });
  });
  assert.equal(await provider().generateText(request), '합성 결과');
});

test('split SSE, CRLF, Unicode, role-only chunks and DONE preserve text stream', async (t) => {
  const payload = 'data: {"choices":[{"delta":{"role":"assistant"}}]}\r\n\r\n' +
    'data: {"choices":[{"delta":{"content":"[인지] 색종이"}}]}\n\n' +
    'data: {"choices":[{"delta":{"content":" 접음"},"finish_reason":"stop"}]}\n\n' + 'data: [DONE]';
  const bytes = new TextEncoder().encode(payload);
  t.mock.method(globalThis, 'fetch', async () => new Response(new ReadableStream({
    start(controller) { for (let i = 0; i < bytes.length; i += 7) controller.enqueue(bytes.slice(i, i + 7)); controller.close(); },
  })));
  assert.equal(await text(await provider().streamText(request)), '[인지] 색종이 접음');
});

test('HTTP errors retain Error/status contract without logging upstream body', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('sensitive-provider-body', { status: 429 }));
  await assert.rejects(provider().generateText(request), (error) => error instanceof Error && /429/.test(error.message) && !error.message.includes('sensitive'));
});

test('empty, filtered, truncated and explicit provider error responses reject', async (t) => {
  for (const body of [{ choices: [] }, { choices: [{ message: { content: 'unfinished without status' } }] }, { choices: [{ message: { content: 'partial' }, finish_reason: 'length' }] }, { choices: [{ finish_reason: 'content_filter' }] }, { error: { message: 'private' } }]) {
    const mock = t.mock.method(globalThis, 'fetch', async () => Response.json(body));
    await assert.rejects(provider().generateText(request), Error); mock.mock.restore();
  }
});

test('stream errors and length termination reject the existing stream contract', async (t) => {
  for (const body of [{ error: { message: 'private' } }, { choices: [{ delta: {}, finish_reason: 'length' }] }]) {
    const mock = t.mock.method(globalThis, 'fetch', async () => new Response('data: ' + JSON.stringify(body) + '\n\n'));
    await assert.rejects(text(await provider().streamText(request)), Error); mock.mock.restore();
  }
});

test('caller cancellation reaches fetch for both providers and response modes', async (t) => {
  for (const model of [provider(), new OllamaProvider('http://localhost:11434', 'synthetic-model')]) {
    for (const mode of ['generateText', 'streamText']) {
      const controller = new AbortController();
      let entered;
      const started = new Promise(resolve => { entered = resolve; });
      t.mock.method(globalThis, 'fetch', (_url, options) => new Promise((_resolve, reject) => {
        assert.equal(options.signal, controller.signal);
        options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
        entered();
      }));
      const pending = model[mode]({ ...request, signal: controller.signal });
      const rejected = assert.rejects(pending, { name: 'AbortError' });
      await started;
      controller.abort();
      await rejected;
    }
  }
});

test('cancelling the returned reader cancels the upstream response body', async (t) => {
  let cancelled;
  const cancellation = new Promise((resolve) => { cancelled = resolve; });
  t.mock.method(globalThis, 'fetch', async () => new Response(new ReadableStream({ cancel: cancelled })));
  const stream = await provider().streamText(request);
  await stream.getReader().cancel('user cancelled');
  assert.equal(await cancellation, 'user cancelled');
});

test('Ollama provider is preserved', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'http://localhost:11434/api/chat');
    const body = JSON.parse(options.body);
    assert.equal(Object.hasOwn(body, 'think'), false);
    assert.equal(Object.hasOwn(body.options, 'num_predict'), false);
    assert.equal(Object.hasOwn(body.options, 'num_ctx'), false);
    assert.equal(options.signal, undefined);
    return Response.json({ message: { content: '로컬 합성 결과' } });
  });
  assert.equal(await new OllamaProvider('http://localhost:11434', 'existing-model').generateText(request), '로컬 합성 결과');
});

test('daily, weekly and streaming use cases keep their return shapes', async () => {
  const calls = [];
  const model = {
    async generateText(input) { calls.push(input); return input.messages[0].content.includes('한 어르신의 일일 기록') ? '합성 주간 기록' : '[인지] 합성 인지\n[행동] 합성 행동'; },
    async streamText(input) { calls.push(input); return new Response('[인지] 합성 인지\n[행동] 합성 행동').body; },
  };
  const api = sourceLoader({ '@/lib/ai/provider': { createTextGenerationProvider: () => model } })('src/lib/ai.ts');
  assert.deepEqual(await api.generateDailyRecord('합성 메모'), { cognition: '합성 인지', behavior: '합성 행동' });
  assert.equal(await api.generateWeeklyRecord([{ date: '2026-10-26', cognition: '합성 인지', behavior: null }]), '합성 주간 기록');
  assert.match(await text(await api.streamDailyRecord('합성 메모')), /합성 행동/);
  for (const call of calls) {
    assert.equal(Object.hasOwn(call, 'maxTokens'), false);
    assert.equal(Object.hasOwn(call, 'timeoutMs'), false);
  }
});


test('premature EOF, DONE without stop and an empty completed stream cannot succeed', async (t) => {
  for (const payload of [
    'data: {"choices":[{"delta":{"content":"부분 응답"}}]}\n\n',
    'data: {"choices":[{"delta":{"content":"부분 응답"}}]}\n\ndata: [DONE]\n\n',
    'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n',
  ]) {
    t.mock.method(globalThis, 'fetch', async () => new Response(payload));
    await assert.rejects(text(await provider().streamText(request)), /스트림/);
  }
});

test('normal stop is sufficient even without DONE and accepts a following usage-only chunk', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('data: {"choices":[{"delta":{"content":"완료 응답"},"finish_reason":"stop"}]}\n\ndata: {"choices":[],"usage":{"total_tokens":5}}'));
  assert.equal(await text(await provider().streamText(request)), '완료 응답');
});


test('length truncation is distinguishable from a safety filter in stream and non-stream calls', async (t) => {
  for (const [reason, message] of [['length', /생성 한도/], ['content_filter', /안전 필터/]]) {
    t.mock.method(globalThis, 'fetch', async (_url, options) => JSON.parse(options.body).stream
      ? new Response('data: ' + JSON.stringify({ choices: [{ delta: { content: '[인지] 미완성' }, finish_reason: reason }] }) + '\n\n')
      : Response.json({ choices: [{ message: { content: '[인지] 미완성' }, finish_reason: reason }] }));
    await assert.rejects(provider().generateText(request), message);
    await assert.rejects(text(await provider().streamText(request)), message);
  }
});


test('daily HTTP cancellation reaches the provider without relaxing input or access checks', async () => {
  const controller = new AbortController();
  let receivedSignal;
  const checks = [];
  const route = sourceLoader({
    '@/lib/auth': { getSession: async () => ({ user: { id: 'synthetic', emailVerified: true } }) },
    '@/lib/workspace-access': { requireRecipient: async (...args) => { checks.push(args); }, AccessDeniedError: class extends Error {} },
    '@/lib/ai': { streamDailyRecord: async (_keywords, signal) => { receivedSignal = signal; return new Response('[인지] 합성 [행동]').body; } },
  })('src/app/api/generate-daily/route.ts');
  const req = new Request('https://synthetic.example/api/generate-daily', { method: 'POST', signal: controller.signal,
    body: JSON.stringify({ recipientId: 'synthetic-recipient', keywords: '합성 관찰' }) });
  const response = await route.POST(req);
  assert.equal(response.status, 200);
  assert.equal(receivedSignal, req.signal);
  assert.deepEqual(checks, [['synthetic', 'synthetic-recipient', 'edit']]);
  controller.abort();
  assert.equal(receivedSignal.aborted, true);
  await response.body.cancel();
});
