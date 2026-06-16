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
    const dateStr = format(d, 'yyyy-MM-dd');
    const isFuture = d > today;
    
    return {
      dateStr,
      dayName: format(d, 'E', { locale: ko }),
      isFuture,
    };
  });

  return {
    startOfWeek: format(start, 'yyyy-MM-dd'),
    endOfWeek: format(end, 'yyyy-MM-dd'),
    currentMonth,
    currentWeekOfMonth,
    weekDates,
  };
}

// UTC 환경(도커 등)에서도 항상 한국 시간(KST) 기준의 YYYY-MM-DD를 반환하는 헬퍼 함수
export function getKSTDateStr(date: Date = new Date()) {
  const kstOptions = { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' } as const;
  const parts = new Intl.DateTimeFormat('ko-KR', kstOptions).formatToParts(date);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

