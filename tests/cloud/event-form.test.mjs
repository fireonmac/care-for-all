import test from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import { sourceLoader } from './load-source.mjs';

const base = 'src/app/(main)/recipients/[id]/_components/KeywordInputForm/';
const Placeholder = () => null;
function formFixture(options = {}) {
  const first = { eventId: 'event-one', event: 'Synthetic first event', emotion: '', isCustomEmotion: false, action: '' };
  const second = { eventId: 'event-two', event: '', emotion: '', isCustomEmotion: false, action: '' };
  const values = (options.events ?? [first, second]).map(event => ({ ...event }));
  const errors = {};
  const appended = [];
  const generations = [];
  const focusCalls = [];
  const effects = [];
  let active = options.active ?? [];
  const load = sourceLoader({
    react: { ...React, useState: () => [active, next => { active = next; }], useEffect: callback => { effects.push(callback); } },
    'react-hook-form': {
      useForm: () => ({ control: {}, handleSubmit: (valid, invalid) => async () => {
        errors.events = values.map(value => value.event.trim() ? undefined : { event: { type: 'too_small', message: '일어난 사건을 먼저 적어주세요.' } });
        if (errors.events.some(Boolean)) return invalid?.(errors);
        return valid({ events: values });
      }, reset() {}, formState: { errors },
        getValues: () => values,
        getFieldState: path => ({ invalid: Boolean(errors.events?.[Number(path.split('.')[1])]?.event) }),
        setFocus: path => focusCalls.push(path),
        register: path => ({ name: path, ref() {}, onBlur() {}, onChange(e) { const index = Number(path.split('.')[1]); values[index].event = e.target.value; if (e.target.value.trim() && errors.events) delete errors.events[index]; } }),
        async trigger() {
          errors.events = values.map(value => value.event.trim() ? undefined : { event: { type: 'too_small', message: '일어난 사건을 먼저 적어주세요.' } });
          return errors.events.every(value => !value);
        },
        setValue(path, value) { const index = Number(path.split('.')[1]); values[index] = value; if (value.event.trim() && errors.events) delete errors.events[index]; },
        setError(path, error) { errors.events ??= []; errors.events[Number(path.split('.')[1])] = { event: error }; },
        clearErrors(path) { if (errors.events) delete errors.events[Number(path.split('.')[1])]; },
      }),
      useFieldArray: () => ({ fields: values.map((value, index) => ({ ...value, id: ['rhf-one', 'rhf-two'][index] ?? `rhf-${index}` })), append(value) { appended.push(value); values.push(value); }, remove() {} }),
      // Append updates fields before this subscription receives its new value.
      useWatch: () => options.watchCurrent ? values : [values[0]],
    },
    'next/navigation': { useRouter: () => ({ refresh() {} }) },
    '@/hooks/useToast': { useToast: () => ({ showSuccess() {}, showError() {} }) },
    './useKeywordQueries': {
      useGenerateDailyDraft: () => ({ draft: null, setDraft() {}, isGenerating: false, async generateDraft(input) { generations.push(input); } }),
      useSaveDailyRecordMutation: () => ({ isPending: false }),
    },
    '@/components/ui/accordion': { Accordion: Placeholder, AccordionItem: Placeholder, AccordionTrigger: Placeholder, AccordionContent: Placeholder },
    '@/components/ui/button': { Button: Placeholder },
    '@/components/ui/input': { Input: Placeholder },
    './DraftReviewView': { DraftReviewView: Placeholder },
  });
  return { load, first, second, values, errors, appended, generations, focusCalls, runEffects() { effects.splice(0).forEach(callback => callback()); }, get active() { return active; } };
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


const event = (eventId, content) => ({ eventId, event: content, emotion: '', action: '', isCustomEmotion: false });
function render(f) { return f.load(base + 'KeywordInputForm.tsx').KeywordInputForm({ recipientId: 'synthetic', targetDate: '2026-01-01' }); }
function addButton(tree) {
  return findNodes(tree, Placeholder).find(node => Array.isArray(node.props.children) && node.props.children.some(child => typeof child === 'string' && child.includes('새로운 사건 추가')));
}

test('blank and whitespace-only events block append, open the field and show an accessible inline error', async () => {
  for (const blank of ['', '   ', '\t\n', '　']) {
    const f = formFixture({ events: [event('empty', blank)], watchCurrent: true });
    const button = addButton(render(f));
    assert.equal(button.props.disabled, false); // keyboard users can invoke validation
    await button.props.onClick();
    assert.equal(f.appended.length, 0);
    assert.deepEqual(f.active, ['empty']);
    assert.equal(f.errors.events[0].event.type, 'too_small');
    const Item = f.load(base + 'EventInputItem.tsx').EventInputItem;
    const row = findNodes(render(f), Item)[0];
    const rendered = Item(row.props);
    const input = findNodes(rendered, Placeholder).find(node => node.props['aria-required']);
    const error = findNodes(rendered, 'p').find(node => node.props.role === 'alert');
    assert.equal(input.props['aria-invalid'], true);
    assert.equal(input.props['aria-describedby'], error.props.id);
    assert.match(input.props.className, /border-destructive/);
    assert.equal(input.props.name, 'events.0.event');
    f.runEffects();
    assert.equal(f.focusCalls.at(-1), 'events.0.event');
  }
});

test('editing the first empty event clears its error and permits retry without losing other events', async () => {
  const f = formFixture({ events: [event('one', ''), event('two', 'Second synthetic event')], active: ['two'], watchCurrent: true });
  await addButton(render(f)).props.onClick();
  assert.deepEqual(f.active, ['one']);
  const Item = f.load(base + 'EventInputItem.tsx').EventInputItem;
  findNodes(render(f), Item)[0].props.onUpdate({ event: 'First synthetic event' });
  assert.equal(f.errors.events[0], undefined);
  assert.equal(f.values[1].event, 'Second synthetic event');
  await addButton(render(f)).props.onClick();
  assert.equal(f.appended.length, 1);
  assert.equal(f.values.length, 3);
  assert.equal(f.values[2].event, '');
  assert.deepEqual(f.active, [f.values[2].eventId]);
});

test('a stale enabled handler rechecks the latest values and cannot append multiple blank cards', async () => {
  const f = formFixture({ events: [event('one', 'Synthetic event')], watchCurrent: true });
  const handler = addButton(render(f)).props.onClick;
  await Promise.all([handler(), handler()]);
  assert.equal(f.appended.length, 1);
  assert.equal(f.errors.events[1].event.type, 'too_small');
  f.values[0].event = '  ';
  await handler();
  assert.equal(f.appended.length, 1);
  assert.deepEqual(f.active, ['one']);
});


test('draft submission reveals and focuses the first invalid event even when it is collapsed', async () => {
  for (const blank of ['', '   ', '\t\n', '　']) {
    const f = formFixture({ events: [event('one', 'Valid synthetic event'), event('two', blank), event('three', '')], active: ['one'], watchCurrent: true });
    await findNodes(render(f), 'form')[0].props.onSubmit();
    assert.deepEqual(f.active, ['two']);
    assert.equal(f.generations.length, 0);
    render(f); f.runEffects();
    assert.equal(f.focusCalls.at(-1), 'events.1.event');
  }
});

test('correcting submit errors advances to the next invalid event then permits normal generation', async () => {
  const f = formFixture({ events: [event('one', ''), event('two', 'Second synthetic event'), event('three', '   ')], active: ['two'], watchCurrent: true });
  await findNodes(render(f), 'form')[0].props.onSubmit();
  assert.deepEqual(f.active, ['one']);
  const Item = f.load(base + 'EventInputItem.tsx').EventInputItem;
  findNodes(render(f), Item)[0].props.eventField.onChange({ target: { value: 'First synthetic event' } });
  await findNodes(render(f), 'form')[0].props.onSubmit();
  assert.deepEqual(f.active, ['three']);
  assert.equal(f.generations.length, 0);
  findNodes(render(f), Item)[2].props.eventField.onChange({ target: { value: 'Third synthetic event' } });
  await findNodes(render(f), 'form')[0].props.onSubmit();
  assert.equal(f.generations.length, 1);
  for (const input of ['First synthetic event', 'Second synthetic event', 'Third synthetic event']) assert.ok(f.generations[0].includes(input));
  assert.equal(f.errors.events.some(Boolean), false);
});
