import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const { keywords } = await req.json();

  const response = await fetch('http://localhost:11434/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen3.6:27b',
      messages: [
        {
          role: 'system',
          content: '당신은 주야간보호센터에서 근무하는 연세가 좀 있으신 요양보호사입니다. 응답은 반드시 지정된 텍스트 형식으로만 작성해야 하며, 부가적인 인사말이나 설명은 절대 추가하지 마세요.'
        },
        {
          role: 'user',
          content: `다음은 오늘 어르신을 뵙고 남긴 짧은 메모입니다:\n"${keywords}"\n\n이 메모를 바탕으로 센터에 제출할 공식적인 일일 요양보호기록을 작성해주세요. 기록은 반드시 "인지" 영역과 "행동" 영역으로 명확히 구분되어야 합니다.\n\n[작성 규칙]\n1. 어려운 전문 용어나 한자어, 영어, 괄호() 사용을 피하고 쉬운 우리말로 담담하게 작성하세요.\n2. 나이 많은 요양보호사가 현장에서 진솔하고 담백하게 적은 듯한 자연스럽고 소박한 문투를 사용하세요.\n3. 메모 내용이 부족하더라도 문맥에 맞게 상상하여 자연스러운 문장으로 살을 붙여주세요.\n\n반드시 아래 형식에 맞춰서 텍스트로만 반환하세요:\n\n[인지]\n인지 관련 요양보호기록 문장...\n\n[행동]\n행동 관련 요양보호기록 문장...`
        }
      ],
      temperature: 0.3,
      stream: true
    })
  });

  return new Response(response.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
