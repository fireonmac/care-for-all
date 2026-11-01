import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceLoader } from './load-source.mjs';

const Placeholder = () => null;
const WeeklyReport = () => null;
const Page = sourceLoader({
  '@/db': { db: new Proxy({}, { get() { throw new Error('Unexpected database access in UI test'); } }) },
  '@/features/recipients/sharing': { getRecipientShares: async () => [] },
  './_components/RecipientSharing': { RecipientSharing: Placeholder },
  './queries': {
    getRecipientOr404: async (id) => ({ id, name: '합성 대상자', canEdit: true, canManage: false }),
    getRecipientRecords: async () => [
      { id: 'daily-a', date: '2026-10-26', type: 'daily' },
      { id: 'daily-b', date: '2026-10-27', type: 'daily' },
    ],
  },
  './_components/KeywordInputForm/KeywordInputForm': { KeywordInputForm: Placeholder },
  './_components/WeeklyReportForm/WeeklyReportForm': { WeeklyReportForm: WeeklyReport },
  './_components/TodayRecordView': { TodayRecordView: Placeholder },
  '@/features/recipients/components/WeekSelector': { WeekSelector: Placeholder },
  '@/components/BackButton': { BackButton: Placeholder },
  'next/link': { default: Placeholder, __esModule: true },
  'lucide-react': { Check: Placeholder },
})('src/app/(main)/recipients/[id]/page.tsx').default;

function findWeekly(node) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) return node.map(findWeekly).find(Boolean);
  if (node.type === WeeklyReport) return node;
  return findWeekly(node.props?.children);
}
async function weekly(id, date) {
  return findWeekly(await Page({ params: Promise.resolve({ id }), searchParams: Promise.resolve({ date }) }));
}

test('changing week or recipient gives the weekly form a separate React state identity', async () => {
  const first = await weekly('recipient-a', '2026-10-26');
  const nextWeek = await weekly('recipient-a', '2026-11-02');
  const otherRecipient = await weekly('recipient-b', '2026-10-26');
  assert.ok(first.key);
  assert.notEqual(first.key, nextWeek.key);
  assert.notEqual(first.key, otherRecipient.key);
  assert.equal(nextWeek.props.weekStartDate, '2026-11-02');
});

test('changing the day within the same recipient/week preserves the weekly form identity', async () => {
  assert.equal((await weekly('recipient-a', '2026-10-26')).key, (await weekly('recipient-a', '2026-11-01')).key);
});

test('past weeks still expose their own report form and daily record count', async () => {
  const past = await weekly('recipient-a', '2026-10-27');
  assert.equal(past.props.weekStartDate, '2026-10-26');
  assert.equal(past.props.dailyRecordCount, 2);
  assert.equal(past.props.recipientId, 'recipient-a');
});
