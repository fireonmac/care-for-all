import test from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { sourceLoader } from './load-source.mjs';

function nodes(node, predicate) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(child => nodes(child, predicate));
  return [...(predicate(node) ? [node] : []), ...nodes(node.props?.children, predicate)];
}
const ui = Object.fromEntries(['Dialog', 'DialogContent', 'DialogHeader', 'DialogTitle', 'DialogFooter', 'DialogTrigger', 'DialogBody'].map(name => [name, name]));
const example = { todayStr: '2026-11-11', status: 'duplicate', suggestedName: '합성 어르신 (2)',
  matches: [{ id: 'synthetic-id', name: '합성 어르신', weeklyRecords: ['2026-11-09'] }],
  weekDates: Array.from({ length: 7 }, (_, i) => ({ dayName: ['월', '화', '수', '목', '금', '토', '일'][i], dateStr: `2026-11-${String(9 + i).padStart(2, '0')}`, isFuture: false })),
};

test('duplicate review reuses the exact list status component, including red missing-day dots', () => {
  const load = sourceLoader({ 'next/link': { __esModule: true, default: 'a' } });
  const Review = load('src/features/recipients/components/DuplicateRecipientReview.tsx').DuplicateRecipientReview;
  const Status = load('src/features/recipients/components/RecipientWeekStatus.tsx').RecipientWeekStatus;
  const html = renderToStaticMarkup(React.createElement(Review, { review: example }));
  const statusHtml = renderToStaticMarkup(React.createElement(Status, { weekDates: example.weekDates, todayStr: example.todayStr, recordDates: example.matches[0].weeklyRecords }));
  assert.ok(html.includes(statusHtml));
  assert.match(html, /href="\/recipients\/synthetic-id"/);
  assert.equal((html.match(/role="listitem"/g) ?? []).length, 7);
  assert.match(html, /2026-11-09 작성 완료/);
  assert.match(html, /2026-11-10 미작성/);
  assert.match(html, /rounded-full bg-destructive/);
  assert.match(html, /2026-11-12 예정/);
  assert.match(html, /2026-11-15 휴무/);
  assert.doesNotMatch(html, /<dialog|<table|주간 리포트/);
});

function registrationFixture() {
  let open = false;
  const state = []; let cursor = 0; const calls = []; const focus = [];
  const form = { register: () => ({ name: 'name', ref() {} }), formState: { errors: {} },
    handleSubmit: callback => () => callback({ name: '합성 어르신' }), setFocus: field => focus.push(field), reset() {} };
  let result = example; let pending;
  const mutation = { isPending: false, isError: false, reset() {}, mutate(payload, options) {
    calls.push(payload); pending = options.onSuccess(result);
  } };
  const invalidations = [];
  const load = sourceLoader({
    react: { ...React, useState: initial => { const index = cursor++; if (!(index in state)) state[index] = initial; return [state[index], next => { state[index] = next; }]; }, useRef: initial => ({ current: initial }), useEffect() {} },
    'react-hook-form': { useForm: () => form },
    '@tanstack/react-query': { useQueryClient: () => ({ invalidateQueries: async value => invalidations.push(value) }) },
    './useRecipientMutations': { useSaveRecipientName: () => mutation },
    'next/navigation': { useRouter: () => ({ refresh() {} }) },
    './DuplicateRecipientReview': { DuplicateRecipientReview: 'Review' },
    '@/components/ui/dialog': ui, '@/components/ui/input': { Input: 'Input' }, '@/components/ui/button': { Button: 'Button' },
  });
  const Component = load('src/features/recipients/components/RecipientNameDialog.tsx').RecipientNameDialog;
  return { calls, invalidations, mutation,
    render: () => { cursor = 0; return Component({ open, onOpenChange: value => { open = value; } }); },
    setResult: value => { result = value; }, completed: () => pending,
  };
}

test('registration switches within the same modal and requires an explicit continue action before numbering', async () => {
  const f = registrationFixture();
  let tree = f.render(); tree.props.onOpenChange(true);
  tree = f.render(); nodes(tree, node => node.type === 'form')[0].props.onSubmit(); await f.completed();
  assert.equal(f.calls.length, 1); assert.equal(f.calls[0].confirmDuplicate, false);
  tree = f.render();
  assert.equal(nodes(tree, node => node.type === 'Dialog').length, 1);
  assert.equal(nodes(tree, node => node.type === 'DialogContent').length, 1);
  assert.equal(nodes(tree, node => node.type === 'form').length, 0);
  assert.deepEqual(nodes(tree, node => node.type === 'Review')[0].props.review, example);
  const buttons = nodes(tree, node => node.type === 'Button');
  f.setResult({ status: 'created', name: '합성 어르신 (2)', id: 'new-id', success: true });
  buttons.find(node => node.props.children === '계속 등록').props.onClick(); await f.completed();
  assert.equal(f.calls[1].confirmDuplicate, true);
  assert.equal(f.invalidations.length, 1);
  assert.equal(f.render().props.open, false);
});

test('name correction returns to the input and pending requests cannot dismiss or submit twice', async () => {
  const f = registrationFixture();
  f.render().props.onOpenChange(true);
  let tree = f.render(); nodes(tree, node => node.type === 'form')[0].props.onSubmit(); await f.completed();
  tree = f.render();
  nodes(tree, node => node.type === 'Button' && node.props.children === '뒤로')[0].props.onClick();
  assert.equal(nodes(f.render(), node => node.type === 'form').length, 1);
  f.mutation.isPending = true;
  tree = f.render(); tree.props.onOpenChange(false);
  nodes(tree, node => node.type === 'form')[0].props.onSubmit();
  assert.equal(f.calls.length, 1); assert.equal(f.render().props.open, true);
});
