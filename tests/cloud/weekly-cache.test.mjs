import test from 'node:test';
import assert from 'node:assert/strict';
import { QueryClient, QueryObserver, MutationObserver } from '@tanstack/react-query';
import { sourceLoader } from './load-source.mjs';

// 실제 훅 옵션과 QueryObserver로 주차 폼 재마운트 시의 캐시 동작을 검증한다.
test('returning to a generated week finds its record even inside the initial query stale time', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: false } } });
  let saved;
  let reads = 0;
  const hooks = sourceLoader({
    '@tanstack/react-query': {
      useQuery: (options) => options,
      useMutation: (options) => new MutationObserver(client, options),
      useQueryClient: () => client,
    },
    '../../actions': {
      getInitialWeeklyReportStatus: async () => { reads++; return saved || { recordId: undefined, status: undefined }; },
      generateWeeklyReportBackground: async () => {
        saved = { recordId: 'synthetic-weekly-record', status: 'COMPLETED' };
        return saved;
      },
    },
    'next/navigation': { useRouter: () => ({ refresh() {} }) },
  })('src/app/(main)/recipients/[id]/_components/WeeklyReportForm/useWeeklyReportQueries.ts');
  const options = hooks.useWeeklyReportInitialQuery('synthetic-recipient', '2026-10-26');
  try {
    await client.fetchQuery(options);
    assert.equal(reads, 1);
    assert.equal(client.getQueryData(options.queryKey).recordId, undefined);
    // 폼이 주차 이동으로 해제되어도 mutation 수준 onSuccess는 해당 주의 캐시를 갱신해야 한다.
    await hooks.useGenerateWeeklyReportMutation().mutate({ recipientId: 'synthetic-recipient', targetDate: '2026-10-26' });
    const returned = new QueryObserver(client, options);
    let onSettled;
    const settled = new Promise((resolve) => { onSettled = resolve; });
    const checkSettled = (result) => { if (result.fetchStatus === 'idle') onSettled(result); };
    const unsubscribe = returned.subscribe(checkSettled);
    checkSettled(returned.getCurrentResult());
    try {
      await settled;
      assert.equal(returned.getCurrentResult().data.recordId, 'synthetic-weekly-record');
      assert.equal(returned.getCurrentResult().data.status, 'COMPLETED');
      assert.ok(reads >= 2);
    } finally { unsubscribe(); }
  } finally { client.clear(); }
});
