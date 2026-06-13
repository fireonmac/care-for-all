import { NextRequest } from 'next/server';

const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'qwen3.5:9b';
const GENERATION_TIMEOUT_MS = 20_000;

export async function POST(req: NextRequest) {
  const { keywords } = await req.json();

  if (typeof keywords !== 'string' || !keywords.trim()) {
    return Response.json({ error: '관찰 내용을 입력해주세요.' }, { status: 400 });
  }

  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [
        {
          role: 'system',
          content: '당신은 주야간보호센터에서 근무하는 연세가 좀 있으신 요양보호사입니다. 응답은 반드시 지정된 텍스트 형식으로만 작성해야 하며, 부가적인 인사말이나 설명은 절대 추가하지 마세요.'
        },
        {
          role: 'user',
          content: `다음은 오늘 어르신을 뵙고 남긴 짧은 메모입니다:\n"${keywords}"\n\n이 메모를 바탕으로 센터에 제출할 공식적인 일일 요양보호기록을 작성해주세요. 기록은 반드시 "인지" 영역과 "행동" 영역으로 명확히 구분되어야 합니다.\n\n[작성 규칙]\n1. 어려운 전문 용어나 한자어, 영어, 괄호() 사용을 피하고 누구나 이해할 수 있는 쉬운 단어를 사용하세요.\n2. 현학적이거나 꾸미는 말을 빼고, 중언부언하지 마세요. 불필요한 미사여구를 제외하고 담담하고 간결명확하게 사실 위주로 작성하세요.\n3. 문장은 되도록 짧게 끊어서 작성하며, 나이 많은 요양보호사가 현장에서 진솔하고 담백하게 관찰한 내용을 일지로 남기는 듯한 소박한 문투를 유지하세요.\n4. "인지"와 "행동" 영역을 다음과 같이 명확히 구분하세요:\n   - [인지]: 어르신의 인식, 정신적 상태, 생각의 흐름, 감정적 변화나 비정상적인 반응에 초점을 맞춥니다.\n   - [행동]: 어르신의 신체적 움직임, 일상 활동(식사, 수면 등) 및 기타 물리적인 행동에 초점을 맞춥니다.\n   - 동일한 사건이라도 '인지'에서는 어르신의 감정과 생각(왜 그렇게 느끼셨는지)을, '행동'에서는 어르신이 실제로 취한 동작과 활동을 분리하여 각기 다른 관점으로 해석해 작성해야 합니다.\n\n반드시 아래 형식에 맞춰서 텍스트로만 반환하세요:\n\n[인지]\n인지 관련 요양보호기록 문장...\n\n[행동]\n행동 관련 요양보호기록 문장...`
        }
      ],
      think: false,
      stream: true,
      keep_alive: '30m',
      options: {
        num_ctx: 2048,
        num_predict: 220,
        temperature: 0.3,
      },
    }),
    signal: AbortSignal.timeout(GENERATION_TIMEOUT_MS),
  });

  if (!response.ok || !response.body) {
    const errorText = await response.text();
    console.error('Ollama API Error:', errorText);
    return Response.json({ error: 'AI 서비스 연결에 실패했습니다.' }, { status: 502 });
  }

  let buffer = '';
  const contentStream = response.body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new TransformStream<string, string>({
      transform(chunk, controller) {
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.trim()) continue;
          const data = JSON.parse(line);
          if (data.message?.content) {
            controller.enqueue(data.message.content);
          }
        }
      },
      flush(controller) {
        if (!buffer.trim()) return;
        const data = JSON.parse(buffer);
        if (data.message?.content) {
          controller.enqueue(data.message.content);
        }
      },
    }))
    .pipeThrough(new TextEncoderStream());

  return new Response(contentStream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
    },
  });
}
