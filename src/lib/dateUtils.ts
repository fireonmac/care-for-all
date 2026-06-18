import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  getWeekOfMonth,
  getMonth,
  startOfDay,
} from 'date-fns';
import { ko } from 'date-fns/locale';

export function getWeekData(targetDateStr: string) {
  const targetDate = startOfDay(new Date(targetDateStr));

  // 한국식 달력: 한 주의 시작을 월요일(1)로 설정
  const start = startOfWeek(targetDate, { weekStartsOn: 1 });
  const end = endOfWeek(targetDate, { weekStartsOn: 1 });

  // 해당 주차가 어느 달에 속하는지는 보통 목요일(과반수)을 기준으로 정합니다.
  const thursday = new Date(start);
  thursday.setDate(thursday.getDate() + 3);

  const currentMonth = getMonth(thursday) + 1;
  const currentWeekOfMonth = getWeekOfMonth(thursday, { weekStartsOn: 1 });

  const today = startOfDay(new Date());
  const days = eachDayOfInterval({ start, end });
  const weekDates = days.map((d) => {
    const dateStr = getKSTDateStr(d);
    const isFuture = d > today;
    
    return {
      dateStr,
      dayName: format(d, 'E', { locale: ko }),
      isFuture,
    };
  });

  return {
    startOfWeek: getKSTDateStr(start),
    endOfWeek: getKSTDateStr(end),
    currentMonth,
    currentWeekOfMonth,
    weekDates,
  };
}

export function getKSTDateStr(date: Date = new Date()) {
  return format(date, 'yyyy-MM-dd');
}

