export const DAILY_INPUT_LIMIT = 4000;
export const WEEKLY_INPUT_LIMIT = 16000;

export function validateAiInput(input: string, limit: number) {
  if (!input.trim() || input.length > limit) throw new Error(`관찰 내용은 1자 이상 ${limit}자 이내로 입력해주세요.`);
}
