import test from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import { sourceLoader } from './load-source.mjs';

const load = sourceLoader();
const { parseDailyRecord, parseDailyRecordProgress, formatDailyRecord } = load('src/lib/daily-record.ts');
const { createDailyRecordMessages, createWeeklyRecordMessages } = load('src/lib/ai/prompts.ts');
const expected = { behavior: '신체 합성 원문', cognition: '인지 합성 원문' };

test('physical-first AI format round-trips without swapping persisted fields, including empty areas', () => {
  for (const draft of [expected, { behavior: '', cognition: expected.cognition }, { behavior: expected.behavior, cognition: '' }]) {
    const text = formatDailyRecord(draft);
    assert.ok(text.startsWith('[신체]\n'));
    assert.ok(text.indexOf('[신체]') < text.indexOf('[인지]'));
    assert.deepEqual(parseDailyRecord(text), draft);
  }
  assert.deepEqual(parseDailyRecord('[인지] 인지 합성 원문\n[행동] 신체 합성 원문'), expected);
  for (const invalid of ['[인지] 반대 [신체] 순서', '[신체] 미완성', '[신체] [인지]', '[신체]'+'가'.repeat(1001)+'[인지] 인지']) {
    assert.throws(() => parseDailyRecord(invalid));
  }
});

test('every split marker stays out of partial values in current and legacy streams', () => {
  for (const text of [formatDailyRecord(expected), '[인지]\n인지 합성 원문\n\n[행동]\n신체 합성 원문']) {
    for (let end = 0; end <= text.length; end++) {
      const draft = parseDailyRecordProgress(text.slice(0, end));
      assert.ok(expected.behavior.startsWith(draft.behavior));
      assert.ok(expected.cognition.startsWith(draft.cognition));
      assert.equal(/[\[\]]/.test(draft.behavior + draft.cognition), false);
    }
    assert.deepEqual(parseDailyRecordProgress(text), expected);
  }
});

test('new streamed bytes update physical content first and finalize to the same fields', async t => {
  const states = [];
  const text = formatDailyRecord(expected);
  const bytes = new TextEncoder().encode(text);
  t.mock.method(globalThis, 'fetch', async () => new Response(new ReadableStream({
    start(controller) { for (const byte of bytes) controller.enqueue(Uint8Array.of(byte)); controller.close(); },
  })));
  const hook = sourceLoader({
    react: { useState: value => [value, next => { if (next && typeof next === 'object') states.push(next); }] },
    '@tanstack/react-query': {}, '../../actions': {},
  })('src/app/(main)/recipients/[id]/_components/KeywordInputForm/useKeywordQueries.ts').useGenerateDailyDraft('synthetic');
  await hook.generateDraft('합성 메모');
  assert.ok(states.some(draft => draft.behavior && !draft.cognition));
  for (const draft of states) assert.equal(/[\[\]]/.test(draft.behavior + draft.cognition), false);
  assert.deepEqual(states.at(-1), expected);
});

test('daily prompt examples and weekly input/output instructions consistently put physical first', async () => {
  const prompt = createDailyRecordMessages('합성')[0].content;
  assert.deepEqual(prompt.match(/\[(?:신체|인지|행동)\]/g), ['[신체]', '[인지]', '[신체]', '[인지]', '[신체]', '[인지]']);
  assert.ok(prompt.indexOf('- 신체:') < prompt.indexOf('- 인지:'));
  assert.match(createWeeklyRecordMessages('합성')[0].content, /신체에 관한 내용을 먼저/);
  const api = sourceLoader({ '@/lib/ai/provider': { createTextGenerationProvider: () => ({
    generateText: async request => {
      assert.equal(request.messages[1].content, '[2026-11-03]\n신체: 신체 합성 원문\n인지: 인지 합성 원문');
      return '합성 주간';
    },
  }) } })('src/lib/ai.ts');
  assert.equal(await api.generateWeeklyRecord([{ date: '2026-11-03', ...expected }]), '합성 주간');
});

const Placeholder = () => null;
function nodes(node, predicate) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(child => nodes(child, predicate));
  return [...(predicate(node) ? [node] : []), ...nodes(node.props?.children, predicate)];
}
function label(node) { return (Array.isArray(node.props.children) ? node.props.children : [node.props.children]).join(''); }
function uiLoader(extra = {}) {
  return sourceLoader({
    react: { ...React, useState: value => [value, () => {}], useTransition: () => [false, callback => callback()] },
    'next/navigation': { useRouter: () => ({ push() {}, refresh() {} }) },
    '@/hooks/useToast': { useToast: () => ({ showSuccess() {}, showError() {} }) },
    '@/components/ui/button': { Button: Placeholder },
    '@/components/ui/textarea': { Textarea: Placeholder },
    '@/components/CopyButton': { CopyButton: Placeholder },
    '@/components/ConfirmDeleteModal': { ConfirmDeleteModal: Placeholder },
    '@/components/BackButton': { BackButton: Placeholder },
    '../actions': { deleteRecord() {}, updateDailyRecord() {} },
    ...extra,
  });
}

test('detail headings and copy buttons show old stored physical data before cognitive data', () => {
  const tree = uiLoader()('src/app/(main)/recipients/[id]/_components/TodayRecordView.tsx').TodayRecordView({
    record: { id: 'synthetic', date: '2026-11-03', behaviorContent: expected.behavior, cognitionContent: expected.cognition },
    recipientId: 'synthetic', canEdit: false,
  });
  assert.deepEqual(nodes(tree, node => node.type === 'h3').map(label), ['신체 영역', '인지 영역']);
  assert.deepEqual(nodes(tree, node => 'text' in node.props && 'title' in node.props).map(node => [node.props.title, node.props.text]),
    [['신체 영역 복사', expected.behavior], ['인지 영역 복사', expected.cognition]]);
});

test('review inputs, loading labels and changes use physical-first fields', () => {
  let changed;
  const props = { draft: expected, loading: false, saving: false, onDraftChange: value => { changed = value; }, onDiscard() {}, onSave() {} };
  const Review = uiLoader()('src/app/(main)/recipients/[id]/_components/KeywordInputForm/DraftReviewView.tsx').DraftReviewView;
  const tree = Review(props);
  assert.deepEqual(nodes(tree, node => node.type === 'h3').map(label), ['신체 영역', '인지 영역']);
  const inputs = nodes(tree, node => node.props['aria-labelledby']);
  assert.deepEqual(inputs.map(node => node.props.value), [expected.behavior, expected.cognition]);
  inputs[0].props.onChange({ target: { value: '신체 수정' } });
  assert.deepEqual(changed, { ...expected, behavior: '신체 수정' });
  inputs[1].props.onChange({ target: { value: '인지 수정' } });
  assert.deepEqual(changed, { ...expected, cognition: '인지 수정' });
  const loading = Review({ ...props, loading: true, draft: { cognition: '', behavior: '' } });
  assert.deepEqual(nodes(loading, node => node.props['aria-labelledby']).map(node => node.props.placeholder),
    ['신체 영역 작성을 준비하고 있습니다...', '인지 영역 작성을 준비하고 있습니다...']);
});

test('edit displays physical first while preserving old updateDailyRecord argument order', () => {
  const states = []; let saved;
  const Edit = uiLoader({
    react: { ...React, useState: value => { const index = states.push(value) - 1; return [value, next => { states[index] = next; }]; }, useTransition: () => [false, callback => callback()] },
    '../actions': { updateDailyRecord: (...args) => { saved = args; } },
  })('src/app/(main)/recipients/[id]/edit/RecordEditForm.tsx').RecordEditForm;
  const tree = Edit({ record: { id: 'synthetic', behaviorContent: expected.behavior, cognitionContent: expected.cognition }, recipientId: 'synthetic', recipientName: '합성', date: '2026-11-03' });
  assert.deepEqual(nodes(tree, node => node.type === 'h3').map(label), ['신체 영역', '인지 영역']);
  const inputs = nodes(tree, node => node.props['aria-labelledby']);
  assert.deepEqual(inputs.map(node => node.props.value), [expected.behavior, expected.cognition]);
  inputs[0].props.onChange({ target: { value: '신체 수정' } });
  assert.deepEqual(states, [expected.cognition, '신체 수정']);
  nodes(tree, node => node.props.children === '저장하기')[0].props.onClick();
  assert.deepEqual(saved, ['synthetic', expected.cognition, expected.behavior]);
});
