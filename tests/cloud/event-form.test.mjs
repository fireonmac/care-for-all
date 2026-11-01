import test from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import { sourceLoader } from './load-source.mjs';

const base = 'src/app/(main)/recipients/[id]/_components/KeywordInputForm/';
const Placeholder = () => null;
function formFixture() {
  const first = { eventId: 'event-one', event: 'Synthetic first event', emotion: '', isCustomEmotion: false, action: '' };
  const second = { eventId: 'event-two', event: '', emotion: '', isCustomEmotion: false, action: '' };
  const load = sourceLoader({
    react: { ...React, useState: initial => [initial, () => {}] },
    'react-hook-form': {
      useForm: () => ({ control: {}, handleSubmit: fn => fn, setValue() {}, reset() {} }),
      useFieldArray: () => ({ fields: [{ ...first, id: 'rhf-one' }, { ...second, id: 'rhf-two' }], append() {}, remove() {} }),
      // Append updates fields before this subscription receives its new value.
      useWatch: () => [first],
    },
    'next/navigation': { useRouter: () => ({ refresh() {} }) },
    '@/hooks/useToast': { useToast: () => ({ showSuccess() {}, showError() {} }) },
    './useKeywordQueries': {
      useGenerateDailyDraft: () => ({ draft: null, setDraft() {}, isGenerating: false }),
      useSaveDailyRecordMutation: () => ({ isPending: false }),
    },
    '@/components/ui/accordion': { Accordion: Placeholder, AccordionItem: Placeholder, AccordionTrigger: Placeholder, AccordionContent: Placeholder },
    '@/components/ui/button': { Button: Placeholder },
    '@/components/ui/input': { Input: Placeholder },
    './DraftReviewView': { DraftReviewView: Placeholder },
  });
  return { load, first, second };
}
function findNodes(node, type) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(child => findNodes(child, type));
  return [...(node.type === type ? [node] : []), ...findNodes(node.props?.children, type)];
}

test('an appended event renders while watched values still contain only the previous events', () => {
  const f = formFixture();
  const Page = f.load(base + 'KeywordInputForm.tsx').KeywordInputForm;
  const Item = f.load(base + 'EventInputItem.tsx').EventInputItem;
  const tree = Page({ recipientId: 'synthetic', targetDate: '2026-01-01' });
  const rows = findNodes(tree, Item);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].props.event.event, f.first.event);
  assert.equal(rows[1].props.event.eventId, f.second.eventId);
  assert.doesNotThrow(() => rows.forEach(row => Item(row.props)));
});

test('accordion identity uses the event identity rather than react-hook-form internal keys', () => {
  const f = formFixture();
  const Page = f.load(base + 'KeywordInputForm.tsx').KeywordInputForm;
  const Item = f.load(base + 'EventInputItem.tsx').EventInputItem;
  const tree = Page({ recipientId: 'synthetic', targetDate: '2026-01-01' });
  const rows = findNodes(tree, Item);
  assert.equal(rows[0].key, 'rhf-one');
  assert.equal(Item(rows[0].props).props.value, 'event-one');
  const accordions = findNodes(tree, Placeholder).filter(n => Array.isArray(n.props.value));
  assert.deepEqual(accordions[0].props.value, ['event-one']);
});
