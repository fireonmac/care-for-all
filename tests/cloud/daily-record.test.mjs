import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceLoader } from './load-source.mjs';
const { parseDailyRecord, dailyRecordDraftSchema } = sourceLoader()('src/lib/daily-record.ts');

test('final draft validation rejects missing/reversed markers, blank and oversized output', () => {
  for (const text of ['', '자유 형식', '[인지] 합성 기록', '[행동] 행동 [인지] 인지', '[인지]   [행동]   ', '[인지]' + '가'.repeat(1001) + '[행동]']) {
    assert.throws(() => parseDailyRecord(text));
  }
  assert.deepEqual(parseDailyRecord('[인지] 합성 인지\n[행동] 합성 행동'), { cognition: '합성 인지', behavior: '합성 행동' });
  // 관찰이 없는 영역을 채우도록 강제하지 않는다.
  assert.deepEqual(parseDailyRecord('[인지]\n[행동] 합성 행동'), { cognition: '', behavior: '합성 행동' });
  assert.equal(dailyRecordDraftSchema.safeParse({ cognition: ' ', behavior: ' ' }).success, false);
});

test('daily stream and non-stream paths enforce identical final format without changing valid bytes', async () => {
  let output;
  const ai = sourceLoader({ '@/lib/ai/provider': { createTextGenerationProvider: () => ({
    generateText: async () => output,
    streamText: async () => new Response(output).body,
  }) } })('src/lib/ai.ts');
  for (output of ['', '형식 없는 합성 기록', '[인지] 미완성', '[인지] [행동]']) {
    await assert.rejects(ai.generateDailyRecord('합성 메모'));
    await assert.rejects(new Response(await ai.streamDailyRecord('합성 메모')).text());
  }
  output = '[인지] 합성 인지\n[행동] 합성 행동';
  assert.equal(await new Response(await ai.streamDailyRecord('합성 메모')).text(), output);
});

test('save/update reject empty drafts before DB writes even when called without the UI', async () => {
  let writes = 0;
  const actions = sourceLoader({
    '@/lib/workspace-access': { requireActor: async () => ({ id: 'synthetic' }) },
    '@/db': { db: { insert() { writes++; }, update() { writes++; } } },
    'next/cache': { revalidatePath() {} },
  })('src/app/(main)/recipients/[id]/actions.ts');
  await assert.rejects(actions.saveDailyRecord('synthetic', ' ', '', '2026-11-01'));
  await assert.rejects(actions.updateDailyRecord('synthetic', '', ' '));
  assert.equal(writes, 0);
});

test('client discards a malformed final stream rather than retaining its partial draft', async (t) => {
  const state = [];
  let output = '[인지] 미완성';
  t.mock.method(globalThis, 'fetch', async () => new Response(output));
  const load = sourceLoader({
    'react': { useState: (value) => { const index = state.push(value) - 1; return [value, (next) => { state[index] = next; }]; } },
    '@tanstack/react-query': {}, '../../actions': {},
  });
  const hook = load('src/app/(main)/recipients/[id]/_components/KeywordInputForm/useKeywordQueries.ts').useGenerateDailyDraft();
  await assert.rejects(hook.generateDraft('합성 메모'));
  assert.deepEqual(state, [false, null]);
  output = '[인지] 합성 인지 [행동] 합성 행동';
  await hook.generateDraft('합성 메모');
  assert.deepEqual(state, [false, { cognition: '합성 인지', behavior: '합성 행동' }]);
});


test('a mid-stream network failure clears the draft, releases its lock and explains that input is retained', async (t) => {
  const state = [];
  const body = new ReadableStream({
    start(controller) { controller.enqueue(new TextEncoder().encode('[인지] 부분 응답')); },
    pull(controller) { controller.error(new TypeError('terminated')); },
  });
  t.mock.method(globalThis, 'fetch', async () => new Response(body));
  const hook = sourceLoader({
    react: { useState: value => { const index=state.push(value)-1; return [value,next=>{state[index]=next;}]; } },
    '@tanstack/react-query': {}, '../../actions': {},
  })('src/app/(main)/recipients/[id]/_components/KeywordInputForm/useKeywordQueries.ts').useGenerateDailyDraft('synthetic');
  await assert.rejects(hook.generateDraft('합성 메모'), /입력한 내용은 그대로/);
  assert.deepEqual(state, [false, null]);
  assert.equal(body.locked, false);
});
