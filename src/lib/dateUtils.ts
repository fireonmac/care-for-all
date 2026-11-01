// 기관별 시간대 설정을 도입할 때 이 기준을 기관 설정으로 대체한다.
export const RECORD_TIME_ZONE = 'Asia/Seoul';

const kstDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: RECORD_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
});
const DAY_NAMES = ['월', '화', '수', '목', '금', '토', '일'];

export function getKSTDateStr(date: Date = new Date()) {
  const parts = kstDateFormatter.formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)!.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

// 날짜 문자열은 KST 달력의 날짜다. UTC 필드로 계산해 호스트 시간대/DST에 의존하지 않는다.
function calendarDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new RangeError('올바른 YYYY-MM-DD 날짜가 필요합니다.');
  }
  return date;
}

export function addCalendarDays(value: string, days: number) {
  const date = calendarDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getWeekData(targetDateStr: string) {
  const targetDate = calendarDate(targetDateStr);
  const mondayOffset = (targetDate.getUTCDay() + 6) % 7;
  const start = addCalendarDays(targetDateStr, -mondayOffset);
  const end = addCalendarDays(start, 6);
  const thursday = calendarDate(addCalendarDays(start, 3));
  const monthStart = calendarDate(`${thursday.toISOString().slice(0, 7)}-01`);
  const monthOffset = (monthStart.getUTCDay() + 6) % 7;
  const today = getKSTDateStr();

  return {
    startOfWeek: start,
    endOfWeek: end,
    currentMonth: thursday.getUTCMonth() + 1,
    currentWeekOfMonth: Math.ceil((thursday.getUTCDate() + monthOffset) / 7),
    weekDates: DAY_NAMES.map((dayName, index) => {
      const dateStr = addCalendarDays(start, index);
      return { dateStr, dayName, isFuture: dateStr > today };
    }),
  };
}
