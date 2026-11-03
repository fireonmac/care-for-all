import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceLoader } from './load-source.mjs';

function find(node, predicate) {
  if (!node || typeof node !== 'object') return undefined;
  if (Array.isArray(node)) return node.map(n => find(n, predicate)).find(Boolean);
  return predicate(node) ? node : find(node.props?.children, predicate);
}

test('manual entry opens editable fields and saves without any AI generation', () => {
  let draft = null, saved = null, aiCalls = 0;
  const Placeholder = () => null; const Review = () => null;
  const Form = sourceLoader({
    react: { useState: value => [value, () => {}], useEffect() {} },
    'react-hook-form': { useForm: () => ({ control: {}, handleSubmit: fn => fn, setValue() {}, reset() {}, formState: { errors: {} } }),
      useFieldArray: () => ({ fields: [], append() {}, remove() {} }), useWatch: () => [] },
    './useKeywordQueries': { useGenerateDailyDraft: () => ({ draft, setDraft: value => { draft = value; }, isGenerating: false, generateDraft: () => { aiCalls++; } }),
      useSaveDailyRecordMutation: () => ({ isPending: false, mutate: value => { saved = value; } }) },
    './DraftReviewView': { DraftReviewView: Review }, './EventInputItem': { EventInputItem: Placeholder },
    '@/components/ui/button': { Button: Placeholder }, '@/components/ui/accordion': { Accordion: Placeholder },
    '@/hooks/useToast': { useToast: () => ({ showSuccess() {}, showError() {} }) },
    'next/navigation': { useRouter: () => ({ refresh() {} }) },
  })('src/app/(main)/recipients/[id]/_components/KeywordInputForm/KeywordInputForm.tsx').KeywordInputForm;
  const props = { recipientId: 'synthetic', targetDate: '2025-01-01' };
  const button = find(Form(props), n => n.props?.children === '직접 기록 작성');
  assert.ok(button); assert.equal(button.props.disabled, false); button.props.onClick();
  let review = Form(props); assert.equal(review.type, Review);
  review.props.onDraftChange({ cognition: '직접 쓴 합성 관찰', behavior: '' });
  review = Form(props); review.props.onSave();
  assert.equal(aiCalls, 0);
  assert.deepEqual(saved, { ...props, cognition: '직접 쓴 합성 관찰', behavior: '' });
});

test('generation failure preserves the service error guidance and clears partial draft', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ error: 'AI 서비스 연결에 실패했습니다.' }, { status: 502 }));
  const state = [];
  const hook = sourceLoader({ react: { useState: initial => { const index = state.push(initial) - 1; return [initial, value => { state[index] = value; }]; } },
    '@tanstack/react-query': {}, '../../actions': {} })('src/app/(main)/recipients/[id]/_components/KeywordInputForm/useKeywordQueries.ts').useGenerateDailyDraft('synthetic');
  await assert.rejects(hook.generateDraft('합성 입력'), /AI 서비스 연결/);
  assert.deepEqual(state, [false, null]);
});
