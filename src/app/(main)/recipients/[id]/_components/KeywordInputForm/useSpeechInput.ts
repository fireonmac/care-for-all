import { useEffect, useRef, useState } from 'react';
import { createSpeechAudio } from './speechAudio';
import { createSpeechSession, idleSpeech, recognitionConstructor, speechErrorMessage, type RecognitionConstructor } from './speechRecognition';

export type SpeechTarget = { eventId: string; field: 'event' | 'action' | 'emotion' };

export function useSpeechInput(
  onFinal: (target: SpeechTarget, text: string) => void,
  onNotice: (message: string) => void,
) {
  const [state, setState] = useState(idleSpeech);
  const [target, setTarget] = useState<SpeechTarget | null>(null);
  const session = useRef<ReturnType<typeof createSpeechSession> | null>(null);
  const audio = useRef<ReturnType<typeof createSpeechAudio>>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [appendVersion, setAppendVersion] = useState(0);
  const callbacks = useRef({ onFinal, onNotice });
  // Browser callbacks must read the latest form values and field-array positions.
  useEffect(() => { callbacks.current = { onFinal, onNotice }; }, [onFinal, onNotice]);
  useEffect(() => {
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
    const browser: Window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor } = window;
    const Recognition = recognitionConstructor(browser);
    if (!Recognition || !window.isSecureContext) {
      setState(idleSpeech); setTarget(null);
      callbacks.current.onNotice(speechErrorMessage(!window.isSecureContext ? 'insecure-context' : 'unsupported'));
      return;
    }
    setTarget(next);
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
      });
      session.current = current;
      current.start();
    } catch {
      audio.current?.dispose(); audio.current = null; setAnalyser(null);
      session.current = null;
      setState(idleSpeech);
      callbacks.current.onNotice(speechErrorMessage('start'));
    }
  }
  return { state, target, analyser, appendVersion, busy: state.phase !== 'idle', start, stop: () => session.current?.stop(), cancel };
}
export type SpeechInput = ReturnType<typeof useSpeechInput>;
