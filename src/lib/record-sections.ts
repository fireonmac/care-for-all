// 표시·작성 순서의 SSOT. 저장 키는 기존 데이터와의 호환을 위해 유지한다.
export const DAILY_RECORD_SECTIONS = [
  { key: 'behavior', contentKey: 'behaviorContent', label: '신체' },
  { key: 'cognition', contentKey: 'cognitionContent', label: '인지' },
] as const;
