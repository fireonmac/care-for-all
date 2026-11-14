import test from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import { sourceLoader } from './load-source.mjs';

function nodes(node, predicate) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(child => nodes(child, predicate));
  return [...(predicate(node) ? [node] : []), ...nodes(node.props?.children, predicate)];
}

test('management menu opens separate edit and delete dialogs without triggering a mutation', async () => {
  let dialog = null; const calls = []; const navigations = [];
  const mutation = { isPending: false, isError: false, reset() {}, mutate: (id, options) => calls.push({ id, options }) };
  const menu = Object.fromEntries(['DropdownMenu', 'DropdownMenuTrigger', 'DropdownMenuContent', 'DropdownMenuItem', 'DropdownMenuSeparator'].map(key => [key, key]));
  const Component = sourceLoader({
    react: { ...React, useState: () => [dialog, value => { dialog = value; }], useRef: () => ({ current: null }) },
    'next/navigation': { useRouter: () => ({ replace: url => navigations.push(url), refresh() {} }) },
    '@tanstack/react-query': { useQueryClient: () => ({ invalidateQueries: async () => {} }) },
    './useRecipientMutations': { useDeleteRecipient: () => mutation },
    './RecipientNameDialog': { RecipientNameDialog: 'NameDialog' },
    '@/components/ConfirmDeleteModal': { ConfirmDeleteModal: 'DeleteDialog' },
    '@/components/ui/dropdown-menu': menu, '@/components/ui/button': { Button: 'Button' },
  })('src/features/recipients/components/RecipientActions.tsx').RecipientActions;
  const render = () => Component({ recipientId: 'synthetic-id', recipientName: '합성 어르신' });
  let tree = render();
  assert.equal(nodes(tree, node => node.type === 'DropdownMenuTrigger')[0].props.render.props['aria-label'], '어르신 관리 메뉴');
  const items = nodes(tree, node => node.type === 'DropdownMenuItem');
  items[0].props.onClick();
  tree = render();
  assert.equal(nodes(tree, node => node.type === 'NameDialog')[0].props.open, true);
  assert.equal(nodes(tree, node => node.type === 'DropdownMenuContent')[0].props.finalFocus, false);
  assert.equal(nodes(tree, node => node.type === 'DeleteDialog')[0].props.open, false);
  nodes(tree, node => node.type === 'NameDialog')[0].props.onOpenChange(false);
  items[1].props.onClick();
  tree = render();
  const confirmation = nodes(tree, node => node.type === 'DeleteDialog')[0];
  assert.equal(confirmation.props.open, true); assert.equal(calls.length, 0);
  confirmation.props.onConfirm();
  assert.equal(calls[0].id, 'synthetic-id');
  mutation.isPending = true;
  nodes(render(), node => node.type === 'DeleteDialog')[0].props.onOpenChange(false);
  assert.equal(dialog, 'delete');
  mutation.isPending = false; mutation.isError = true; mutation.error = new Error('합성 오류');
  assert.equal(nodes(render(), node => node.type === 'DeleteDialog')[0].props.error, '합성 오류');
  await calls[0].options.onSuccess();
  assert.deepEqual(navigations, ['/']);
});
