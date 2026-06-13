interface FormatResult {
  cognition: string;
  behavior: string;
}

const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'gemma4:26b:27b';
const GENERATION_TIMEOUT_MS = 20_000;

export async function formatKeywordsWithAI(keywords: string): Promise<FormatResult> {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          {
            role: 'system',
            content: '당신은 주야간보호센터에서 근무하는 연세가 좀 있으신 요양보호사입니다. 응답은 반드시 JSON 형식으로만 반환해야 하며, 마크다운이나 다른 부가 설명은 절대 추가하지 마세요.'
          },
          {
            role: 'user',
            content: `다음은 오늘 어르신을 뵙고 남긴 짧은 메모입니다:\n"${keywords}"\n\n이 메모를 바탕으로 센터에 제출할 공식적인 일일 요양보호기록을 작성해주세요. 기록은 반드시 "인지" 영역과 "행동" 영역으로 명확히 구분되어야 합니다.\n\n[작성 규칙]\n1. 어려운 전문 용어나 한자어, 영어, 괄호() 사용을 피하고 쉬운 우리말로 담담하게 작성하세요.\n2. 나이 많은 요양보호사가 현장에서 진솔하고 담백하게 적은 듯한 자연스럽고 소박한 문투를 사용하세요.\n3. 메모 내용이 부족하더라도 문맥에 맞게 상상하여 자연스러운 문장으로 살을 붙여주세요.\n\n반드시 아래 JSON 형식으로 반환하세요:\n{\n  "cognition": "인지 관련 요양보호기록 문장...",\n  "behavior": "행동 관련 요양보호기록 문장..."\n}`
          }
        ],
        format: {
          type: 'object',
          properties: {
            cognition: { type: 'string' },
            behavior: { type: 'string' },
          },
          required: ['cognition', 'behavior'],
        },
        think: false,
        stream: false,
        keep_alive: '30m',
        options: {
          num_ctx: 2048,
          num_predict: 220,
          temperature: 0.3,
        },
      }),
      signal: AbortSignal.timeout(GENERATION_TIMEOUT_MS),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Ollama API Error:', errorText);
      throw new Error(`AI 서비스 연결 오류: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.message.content);
    
    return {
      cognition: result.cognition || '관찰된 인지 특이사항이 없습니다.',
      behavior: result.behavior || '관찰된 행동 특이사항이 없습니다.'
    };
  } catch (error) {
    console.error('AI Formatting Error:', error);
    throw new Error('기록 자동 작성 중 오류가 발생했습니다.');
  }
}

export async function formatWeeklyReportWithAI(dailyRecords: {date: string, cognition: string | null, behavior: string | null}[]): Promise<string> {
  const recordsText = dailyRecords.map(r => `[${r.date}]\n인지: ${r.cognition}\n행동: ${r.behavior}`).join('\n\n');

  try {
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          {
            role: 'system',
            content: '당신은 주야간보호센터에서 근무하는 연세가 좀 있으신 요양보호사입니다. 응답은 반드시 JSON 형식으로만 반환해야 하며, 마크다운이나 다른 부가 설명은 절대 추가하지 마세요.'
          },
          {
            role: 'user',
            content: `다음은 한 어르신의 이번 주 일일 요양보호기록 내역입니다:\n\n${recordsText}\n\n이 기록들을 바탕으로 어르신의 "주간 요양보호기록(주간 리포트)"을 하나의 종합된 글로 작성해주세요.\n\n[작성 규칙]\n1. 어려운 전문 용어나 한자어, 괄호() 사용을 피하고 쉬운 우리말로 담담하게 작성하세요.\n2. 나이 많은 요양보호사가 어르신을 일주일 동안 정성껏 돌보고 느낀 점을 진솔하게 적은 듯한 소박한 문투를 사용하세요.\n3. 인지와 행동의 변화 흐름이 잘 드러나야 합니다.\n\n반드시 아래 JSON 형식으로 반환하세요:\n{\n  "report": "주간 요양보호기록 종합 문장..."\n}`
          }
        ],
        format: {
          type: 'object',
          properties: {
            report: { type: 'string' },
          },
          required: ['report'],
        },
        think: false,
        stream: false,
        keep_alive: '30m',
        options: {
          num_ctx: 4096,
          num_predict: 500,
          temperature: 0.3,
        },
      }),
      signal: AbortSignal.timeout(GENERATION_TIMEOUT_MS),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Ollama Weekly API Error:', errorText);
      throw new Error(`AI 서비스 연결 오류: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.message.content);
    
    return result.report || '주간 리포트 생성에 실패했습니다.';
  } catch (error) {
    console.error('AI Weekly Formatting Error:', error);
    throw new Error('주간 리포트 자동 작성 중 오류가 발생했습니다.');
  }
}
