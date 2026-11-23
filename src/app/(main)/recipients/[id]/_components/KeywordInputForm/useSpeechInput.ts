import { useEffect, useRef, useState } from 'react';
import { createSpeechSession, idleSpeech, recognitionConstructor, type RecognitionConstructor } from './speechRecognition';

export type SpeechTarget = { eventId: string; field: 'event' | 'action' | 'emotion' };

export function useSpeechInput(onFinal: (target: SpeechTarget, text: string) => void) {
  const [state, setState] = useState(idleSpeech);
  const [target, setTarget] = useState<SpeechTarget | null>(null);
  const session = useRef<ReturnType<typeof createSpeechSession> | null>(null);
  const write = useRef(onFinal);
  // Browser callbacks must read the latest form values and field-array positions.
  useEffect(() => { write.current = onFinal; }, [onFinal]);
  useEffect(() => {
    const leave = () => {
      session.current?.cancel(); session.current = null;
      setState(idleSpeech); setTarget(null);
    };
    const hide = () => { if (document.hidden) leave(); };
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('pagehide', leave);
    return () => {
      session.current?.cancel(); session.current = null;
      document.removeEventListener('visibilitychange', hide);
      window.removeEventListener('pagehide', leave);
    };
  }, []);

  function cancel() {
    session.current?.cancel(); session.current = null;
    setState(idleSpeech); setTarget(null);
  }
  function start(next: SpeechTarget) {
    // Guard synchronous double clicks before React renders the listening state.
    if (session.current) return;
    setTarget(next);
    const browser: Window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor } = window;
    const Recognition = recognitionConstructor(browser);
    if (!Recognition || !window.isSecureContext) {
      setState({ ...idleSpeech, message: '음성 입력을 지원하지 않는 환경이에요. Chrome에서 열거나 직접 입력해주세요.' });
      return;
    }
    try {
      const current = createSpeechSession(Recognition, text => write.current(next, text), nextState => {
        setState(nextState);
        if (nextState.phase === 'idle') session.current = null;
      });
      session.current = current;
      current.start();
    } catch {
      session.current = null;
      setState({ ...idleSpeech, message: '음성 입력을 시작하지 못했어요. 직접 입력하거나 다시 시도해주세요.' });
    }
  }
  return { state, target, busy: state.phase !== 'idle', start, stop: () => session.current?.stop(), cancel };
}
export type SpeechInput = ReturnType<typeof useSpeechInput>;
