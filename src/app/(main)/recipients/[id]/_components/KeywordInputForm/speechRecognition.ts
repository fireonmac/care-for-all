// Narrow browser boundary for the Web Speech API, which is absent from lib.dom.
interface RecognitionResult {
  isFinal: boolean;
  readonly [index: number]: { transcript: string };
}
export interface BrowserRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: { results: ArrayLike<RecognitionResult> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
export type RecognitionConstructor = new () => BrowserRecognition;
export type SpeechPhase = 'idle' | 'starting' | 'listening' | 'stopping';
export interface SpeechState { phase: SpeechPhase; interim: string; message: string; }
export const idleSpeech: SpeechState = { phase: 'idle', interim: '', message: '' };

export function recognitionConstructor(browser: { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor }) {
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
}

function errorMessage(error: string, isBrave: boolean) {
  switch (error) {
    case 'not-allowed': case 'service-not-allowed':
      return '마이크 사용이 허용되지 않았어요. 브라우저의 사이트 설정을 확인해주세요.';
    case 'audio-capture': return '마이크를 찾을 수 없어요. 연결과 기기의 마이크 설정을 확인해주세요.';
    case 'network': return isBrave
      ? 'Brave에서는 음성 인식 서비스에 연결할 수 없어요. Chrome에서 사용해주세요. 입력한 글은 그대로 남아 있어요.'
      : '음성 연결이 끊겼어요. 입력된 글은 남아 있으니 다시 눌러주세요.';
    case 'no-speech': return '말소리를 듣지 못했어요. 마이크를 눌러 다시 말씀해주세요.';
    case 'language-not-supported': return '이 브라우저에서는 한국어 음성 입력을 사용할 수 없어요.';
    default: return '음성 입력을 시작하지 못했어요. 다시 시도하거나 직접 입력해주세요.';
  }
}

// One session per form; late callbacks from a stopped/disposed session cannot write.
export function createSpeechSession(
  Recognition: RecognitionConstructor,
  onFinal: (text: string) => void,
  onState: (state: SpeechState) => void,
  isBrave = false,
) {
  const recognition = new Recognition();
  recognition.lang = 'ko-KR';
  recognition.continuous = true;
  recognition.interimResults = true;
  let active = true;
  let phase: SpeechPhase = 'starting';
  let receivedText = false;
  const committed = new Set<number>();
  const emit = (interim = '', message = '') => onState({ phase, interim, message });
  const detach = () => {
    recognition.onstart = null;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
  };
  const cancel = () => {
    active = false;
    detach();
    try { recognition.abort(); } catch { /* Already ended. */ }
  };
  recognition.onstart = () => {
    if (!active) return;
    if (phase !== 'stopping') phase = 'listening';
    emit();
  };
  recognition.onresult = ({ results }) => {
    if (!active) return;
    const pending: string[] = [];
    for (let index = 0; index < results.length; index++) {
      const result = results[index];
      const text = result[0]?.transcript.trim() ?? '';
      if (result.isFinal) {
        if (!committed.has(index)) {
          committed.add(index);
          if (text) { receivedText = true; onFinal(text); }
        }
      } else if (text) pending.push(text);
    }
    emit(pending.join(' '));
  };
  recognition.onerror = ({ error }) => {
    if (!active) return;
    const emptyStop = phase === 'stopping' && error === 'no-speech';
    cancel();
    phase = 'idle';
    emit('', emptyStop ? '' : errorMessage(error, isBrave));
  };
  recognition.onend = () => {
    if (!active) return;
    active = false;
    detach();
    const stoppedByUser = phase === 'stopping';
    phase = 'idle';
    emit('', receivedText || stoppedByUser ? '' : '입력된 말이 없어요. 마이크를 눌러 다시 말씀해주세요.');
  };
  return {
    start() { emit(); try { recognition.start(); } catch { cancel(); phase = 'idle'; emit('', errorMessage('start', isBrave)); } },
    stop() {
      if (!active || phase === 'stopping') return;
      phase = 'stopping'; emit();
      try { recognition.stop(); } catch { cancel(); phase = 'idle'; emit('', errorMessage('stop', isBrave)); }
    },
    cancel,
  };
}

export function appendDictation(current: string, spoken: string) {
  return current + (current && !/\s$/.test(current) ? ' ' : '') + spoken;
}
