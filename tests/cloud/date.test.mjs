import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { sourceLoader } from './load-source.mjs';
const { getKSTDateStr, getWeekData, addCalendarDays } = sourceLoader()('src/lib/dateUtils.ts');

test('KST midnight and year rollover map the same instants to Korean calendar dates', () => {
  assert.equal(getKSTDateStr(new Date('2026-10-31T14:59:59Z')), '2026-10-31');
  assert.equal(getKSTDateStr(new Date('2026-10-31T15:00:00Z')), '2026-11-01');
  assert.equal(getKSTDateStr(new Date('2026-12-31T15:00:00Z')), '2027-01-01');
});

test('calendar weeks preserve Monday to Sunday and Thursday month ownership across years', () => {
  const week = getWeekData('2027-01-01');
  assert.equal(week.startOfWeek, '2026-12-28');
  assert.equal(week.endOfWeek, '2027-01-03');
  assert.equal(week.currentMonth, 12);
  assert.equal(week.currentWeekOfMonth, 5);
  assert.deepEqual(week.weekDates.map(({ dayName }) => dayName), ['월', '화', '수', '목', '금', '토', '일']);
  assert.equal(addCalendarDays('2024-02-28', 1), '2024-02-29');
  assert.equal(addCalendarDays('2026-12-28', 7), '2027-01-04');
  assert.equal(addCalendarDays('2026-03-09', -7), '2026-03-02');
  for (const value of ['2026-02-30', '2026-2-01', 'not-a-date']) assert.throws(() => getWeekData(value), RangeError);
});

test('UTC, Seoul and Los Angeles produce identical today/future/week navigation at KST midnight', () => {
  const script = `
    import { sourceLoader } from './tests/cloud/load-source.mjs';
    const OriginalDate = Date;
    globalThis.Date = class extends OriginalDate {
      constructor(...args) { super(...(args.length ? args : ['2026-11-01T15:00:00Z'])); }
    };
    const date = sourceLoader()('src/lib/dateUtils.ts');
    console.log(JSON.stringify({ today: date.getKSTDateStr(), week: date.getWeekData('2026-11-02'), prev: date.addCalendarDays('2026-11-02', -7) }));
  `;
  const results = ['UTC', 'Asia/Seoul', 'America/Los_Angeles'].map((TZ) => JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', script], { env: { ...process.env, TZ }, encoding: 'utf8' })));
  assert.deepEqual(results[0], results[1]);
  assert.deepEqual(results[0], results[2]);
  assert.equal(results[0].today, '2026-11-02');
  assert.equal(results[0].week.weekDates[0].isFuture, false);
  assert.equal(results[0].week.weekDates[1].isFuture, true);
  assert.equal(results[0].prev, '2026-10-26');
});
