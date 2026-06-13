import { NextRequest } from 'next/server';

const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'gemma4:26b';
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
          content: '노인주간보호센터와 요양시설에서 사용하는 전문 요양보호 기록 작성 시스템입니다. 현장 요양보호사가 순서와 형식 없이 적은 하루치 관찰 메모를 사건별로 정리하고, 인지와 행동 영역으로 분류하여 전문적이고 자연스러운 기록 문장으로 작성합니다. 입력에 없는 사실이나 원인은 추측하지 않습니다.'
        },
        {
          role: 'user',
          content: `다음은 요양보호사가 하루 동안 생각나는 대로 적은 가공되지 않은 관찰 메모입니다. 메모 전체를 분석하여 센터에 제출할 수 있는 정돈된 일일 요양보호기록으로 작성하세요.

[관찰 메모]
${keywords}

[분류 기준]
- [행동]: 어르신의 보행, 이동, 식사, 수면, 배설, 위생, 신체 활동, 돌발 행동과 그에 대한 요양보호사(작성자)의 대응, 안전 관리, 신체적 도움과 관련된 내용
- [인지]: 어르신의 기억, 시간과 장소에 대한 인식, 판단, 이해, 집중, 의사소통, 느끼는 감정, 태도와 관련된 내용

[처리 절차]
아래 절차는 내부적으로만 수행하고 과정이나 사건 목록은 출력하지 마세요.

1. 관찰 메모 전체를 읽고 서로 다른 시간, 상황, 활동을 기준으로 각각의 사건으로 나눕니다.
2. 여러 문장에 흩어진 같은 사건은 하나로 합치고, 한 문장에 섞인 여러 사건은 분리합니다.
3. 각 사건에서 관찰된 사실, 어르신의 반응, 직원이 제공한 도움과 그 결과를 파악합니다.
4. 사건에 포함된 내용 중 어르신의 [인지]가 포함된 사건들을 먼저 추출합니다.
5. 그 외 나머지 사건들을 읽고 [행동] 부분이 들어간 사건을 추출합니다.
6. 그 외 나머지는 다시 [행동]으로 분류합니다.
6. 분류한 사건들을 기준으로 [행동] 사건을 모아 하나의 연결된 자연스러운 문단으로 작성합니다. [행동]은 사건에 대한 해석을 제외하고 사실을 위주로 담담하게 전달합니다.
7. 분류한 사건들을 기준으로 [인지] 사건을 모아 하나의 연결된 자연스러운 문단으로 작성합니다. [인지]는 사건의 원인 및 동기가 어르신의 인지 능력과 감정에 연결이 되어 있음을 강조합니다.
8. 문제 상황이 발생하고 그에 대한 요양보호사의 적절한 조치가 명시된 경우 해당 문장의 인과관계를 빠뜨리지 않고 잘 나타내도록 합니다.
9. 각 사건은 자연스럽게 연결되도록 접속사를 적절하게 사용합니다.

[핵심 작성 원칙]
1. 전문성과 객관성
   - 주관적인 평가, 감상, 비난, 현장 은어를 배제하고 담담하고 정돈된 기록 문체로 작성합니다.
   - 차별적이거나 거친 입력 표현은 원문의 사실을 유지하면서 중립적인 표현으로 순화합니다.
   - 문제 행동의 원인을 인지 저하, 성격, 의도, 진단으로 임의 해석하지 않습니다.

2. 구체적인 데이터 보존
   - 입력에 포함된 활동, 말, 반복 횟수, 증상, 반응, 제공한 도움과 결과를 왜곡하거나 빠뜨리지 않습니다.
   - 입력에 없는 사실, 시간 순서, 원인과 결과, 처치, 상태 변화는 추가하지 않습니다.

3. 결과 중심 기록
   - 배식, 자리 정리와 같이 통상적인 업무 절차 자체는 중요한 관찰이 아니면 생략합니다.
   - 직원의 도움이 필요했던 이유, 실제로 제공한 도움, 확인된 결과가 입력에 있으면 이를 중심으로 기록합니다.
   - 제공하지 않은 도움이나 확인되지 않은 결과는 만들어 내지 않습니다.

4. 충분한 분량과 자연스러운 문장
   - 메모를 지나치게 압축하지 말고 처음 읽는 사람도 하루의 주요 상황을 이해할 수 있도록 풀어 씁니다.
   - 정보가 충분하면 각 영역을 2~4문장으로 작성하되, 같은 말을 반복하거나 없는 사실로 분량을 채우지 않습니다.
   - 각 영역은 사건별 의미가 구분되면서도 자연스럽게 이어지는 하나의 문단으로 작성합니다.
   - 모든 문장은 자연스러운 "~합니다", "~했습니다", "~보였습니다", "~말씀하셨습니다", "~드렸습니다" 체로 작성합니다.
   - "~함", "~임", "~하심", "~보이심", "~드림"과 같은 개조식 또는 명사형 종결은 사용하지 않습니다.

5. 직접적인 동사 사용
   - 원문에 있는 구체적인 동사를 살리고, 같은 뜻의 명사와 동사를 겹쳐 쓰지 않습니다.
   - "기분을 표현했습니다"보다 "기뻐했습니다", "응원 활동에 참여했습니다"보다 "응원했습니다"처럼 직접 씁니다.
   - "반응을 보였습니다", "모습을 보였습니다", "활동을 진행했습니다", "행동을 했습니다"처럼 뜻을 불필요하게 늘리는 표현을 피합니다.

[출력 전 점검]
- 모든 사건의 중요한 사실이 반영되었습니까?
- 인지와 행동이 올바르게 분류되었습니까?
- 같은 사실이 두 영역에 반복되지 않았습니까?
- 없는 원인이나 사실을 추가하지 않았습니까?
- 딱딱한 명사형 표현을 직접적이고 자연스러운 동사로 다듬었습니까?
- 각 영역이 충분한 분량의 하나의 문단으로 작성되었습니까?

[출력 형식]
[인지]
인지 관련 기록을 하나의 문단으로 작성

[행동]
행동 및 신체활동지원 관련 기록을 하나의 문단으로 작성`
        }
      ],
      think: false,
      stream: true,
      keep_alive: '10m',
      options: {
        num_ctx: 2048,
        num_predict: 500,
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
