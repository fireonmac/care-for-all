import { useEffect, useRef, useState } from 'react';
import { createSpeechAudio } from './speechAudio';
import { createSpeechSession, idleSpeech, recognitionConstructor, type RecognitionConstructor } from './speechRecognition';

export type SpeechTarget = { eventId: string; field: 'event' | 'action' | 'emotion' };

export function useSpeechInput(
  onFinal: (target: SpeechTarget, text: string) => void,
  onNotice: (message: string) => void,
) {
  const [state, setState] = useState(idleSpeech);
  const [target, setTarget] = useState<SpeechTarget | null>(null);
  const session = useRef<ReturnType<typeof createSpeechSession> | null>(null);
  const audio = useRef<ReturnType<typeof createSpeechAudio>>(null);
  const isBrave = useRef(false);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [appendVersion, setAppendVersion] = useState(0);
  const callbacks = useRef({ onFinal, onNotice });
  // Browser callbacks must read the latest form values and field-array positions.
  useEffect(() => { callbacks.current = { onFinal, onNotice }; }, [onFinal, onNotice]);
  useEffect(() => {
    const browser: Navigator & { brave?: { isBrave(): Promise<boolean> } } = navigator;
    void browser.brave?.isBrave().then(value => { isBrave.current = value; }).catch(() => {});
    const leave = () => {
      session.current?.cancel(); session.current = null;
      audio.current?.dispose(); audio.current = null; setAnalyser(null);
      setState(idleSpeech); setTarget(null);
    };
    const hide = () => { if (document.hidden) leave(); };
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('pagehide', leave);
    return () => {
      session.current?.cancel(); session.current = null;
      audio.current?.dispose(); audio.current = null;
      document.removeEventListener('visibilitychange', hide);
      window.removeEventListener('pagehide', leave);
    };
  }, []);

  function cancel() {
    const wasActive = session.current !== null;
    session.current?.cancel(); session.current = null;
    audio.current?.finish(); setAnalyser(null);
    setState(idleSpeech); setTarget(null);
    return wasActive;
  }
  function start(next: SpeechTarget) {
    // Guard synchronous double clicks before React renders the listening state.
    if (session.current) return;
    setTarget(next);
    const browser: Window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor } = window;
    const Recognition = recognitionConstructor(browser);
    if (!Recognition || !window.isSecureContext) {
      setState(idleSpeech);
      callbacks.current.onNotice('음성 입력을 지원하지 않는 환경이에요. Chrome에서 열거나 직접 입력해주세요.');
      return;
    }
    audio.current?.dispose();
    audio.current = createSpeechAudio(setAnalyser);
    try {
      const current = createSpeechSession(Recognition, text => {
        callbacks.current.onFinal(next, text);
        setAppendVersion(version => version + 1);
      }, nextState => {
        setState(nextState);
        if (nextState.message) callbacks.current.onNotice(nextState.message);
        if (nextState.phase === 'listening') audio.current?.start();
        if (nextState.phase === 'stopping') { audio.current?.stopMeter(); setAnalyser(null); }
        if (nextState.phase === 'idle') {
          session.current = null;
          audio.current?.finish(); setAnalyser(null);
        }
      }, isBrave.current);
      session.current = current;
      current.start();
    } catch {
      audio.current?.dispose(); audio.current = null; setAnalyser(null);
      session.current = null;
      setState(idleSpeech);
      callbacks.current.onNotice('음성 입력을 시작하지 못했어요. 직접 입력하거나 다시 시도해주세요.');
    }
  }
  return { state, target, analyser, appendVersion, busy: state.phase !== 'idle', start, stop: () => session.current?.stop(), cancel };
}
export type SpeechInput = ReturnType<typeof useSpeechInput>;
