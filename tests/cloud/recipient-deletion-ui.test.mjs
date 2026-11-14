import test from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import { sourceLoader } from './load-source.mjs';

function nodes(node, predicate) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(child => nodes(child, predicate));
  return [...(predicate(node) ? [node] : []), ...nodes(node.props?.children, predicate)];
}

test('detail deletion uses an inline confirmation, supports cancellation and keeps failed requests visible', async () => {
  let confirming = false;
  const calls = []; const navigations = [];
  const mutation = { isPending: false, isError: false, reset() {}, mutate: (id, options) => calls.push({ id, options }) };
  const Component = sourceLoader({
    react: { ...React, useState: () => [confirming, value => { confirming = value; }], useRef: () => ({ current: null }), useEffect() {} },
    'next/navigation': { useRouter: () => ({ replace: url => navigations.push(url), refresh() {} }) },
    '@tanstack/react-query': { useQueryClient: () => ({ invalidateQueries: async () => {} }) },
    './useRecipientMutations': { useDeleteRecipient: () => mutation },
    '@/components/ui/button': { Button: 'Button' },
  })('src/features/recipients/components/DeleteRecipient.tsx').DeleteRecipient;
  const render = () => Component({ recipientId: 'synthetic-id', recipientName: '합성 어르신' });
  nodes(render(), node => node.type === 'Button')[0].props.onClick();
  assert.equal(calls.length, 0);
  let tree = render();
  assert.equal(nodes(tree, node => node.props.role === 'group').length, 1);
  assert.equal(nodes(tree, node => node.props.role === 'dialog').length, 0);
  nodes(tree, node => node.props.children === '취소')[0].props.onClick();
  assert.equal(confirming, false); assert.equal(calls.length, 0);
  nodes(render(), node => node.type === 'Button')[0].props.onClick();
  tree = render();
  nodes(tree, node => node.type === 'Button' && node.props.variant === 'destructive')[0].props.onClick();
  assert.equal(calls[0].id, 'synthetic-id');
  mutation.isPending = true;
  assert.ok(nodes(render(), node => node.type === 'Button').every(node => node.props.disabled));
  mutation.isPending = false; mutation.isError = true; mutation.error = new Error('합성 오류');
  assert.equal(nodes(render(), node => node.props.role === 'alert')[0].props.children, '합성 오류');
  assert.deepEqual(navigations, []);
  await calls[0].options.onSuccess();
  assert.deepEqual(navigations, ['/']);
});
