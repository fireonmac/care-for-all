import test from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import { sourceLoader } from './load-source.mjs';
function nodes(node, type) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(child => nodes(child, type));
  return [...(node.type === type ? [node] : []), ...nodes(node.props?.children, type), ...nodes(node.props?.render, type)];
}
function report(status, overrides = {}) {
  const initial = status === 'LOADING' ? { isLoading: true } : { isLoading: false, data: status === 'IDLE' ? {} : { recordId: 'synthetic-report', status } };
  const hook = () => ({ isPending: false, mutate() {}, mutateAsync() {} });
  const Component = sourceLoader({
    react: { ...React, useState: value => [value, () => {}], useEffect() {}, useRef: value => ({ current: value }) },
    './useWeeklyReportQueries': {
      useWeeklyReportInitialQuery: () => initial,
      useWeeklyRecordPollingQuery: () => ({ data: status === 'LOADING' || status === 'IDLE' ? undefined : { status, combinedContent: '합성 주간' } }),
      useGenerateWeeklyReportMutation: hook, useUpdateWeeklyRecordMutation: hook, useDeleteWeeklyRecordMutation: hook,
    },
    '@/hooks/useToast': { useToast: () => ({ showSuccess() {}, showError() {}, showInfo() {} }) },
    './WeeklyReportModal': { WeeklyReportModal: 'WeeklyModal' },
    '@/components/ui/button': { Button: 'Button' }, '@/components/ui/dialog': { Dialog: 'Dialog', DialogTrigger: 'Trigger' },
  })('src/app/(main)/recipients/[id]/_components/WeeklyReportForm/WeeklyReportForm.tsx').WeeklyReportForm;
  return Component({ recipientId: 'synthetic', recipientName: '합성', currentMonth: 11, currentWeekOfMonth: 3,
    dailyRecordCount: 3, weekStartDate: '2026-11-09', canGenerate: true, ...overrides });
}

test('every weekly report state uses the same button footprint and names its selected week', () => {
  for (const status of ['LOADING', 'IDLE', 'PROCESSING', 'FAILED', 'COMPLETED']) {
    const tree = report(status);
    const buttons = nodes(tree, 'Button');
    assert.equal(buttons.length, 1, status);
    assert.match(buttons[0].props.className, /h-11 w-full/);
    assert.match(buttons[0].props['aria-label'], /^11월 3주차 주간 리포트 /);
    if (status === 'COMPLETED') {
      const trigger = nodes(tree, 'Trigger')[0];
      assert.equal(trigger.props.render.type, 'Button');
      assert.equal(nodes(trigger.props.children, 'Button').length, 0);
    }
  }
  assert.equal(report('IDLE', { dailyRecordCount: 1 }), null);
  assert.equal(report('IDLE', { canGenerate: false }), null);
});
