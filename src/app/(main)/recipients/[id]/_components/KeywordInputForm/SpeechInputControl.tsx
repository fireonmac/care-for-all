import { LoaderCircle, Mic, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SpeechInput, SpeechTarget } from './useSpeechInput';

export function SpeechInputControl({ speech, target, label, disabled, inputId }: {
  speech: SpeechInput; target: SpeechTarget; label: string; disabled: boolean; inputId: string;
}) {
  const selected = speech.target?.eventId === target.eventId && speech.target.field === target.field;
  const active = selected && speech.busy;
  const waiting = active && (speech.state.phase === 'starting' || speech.state.phase === 'stopping');
  return <Button type="button" variant="ghost"
    className={`absolute right-1.5 top-1/2 -translate-y-1/2 size-11 p-0 rounded-full ${active ? 'bg-muted text-foreground hover:bg-muted' : ''}`}
    aria-label={`${label} ${active ? speech.state.phase === 'stopping' ? '음성 입력 취소' : '음성 입력 그만하기' : '말해서 입력'}`}
    aria-pressed={active} aria-controls={inputId} aria-describedby="speech-input-notice"
    title={active ? speech.state.phase === 'stopping' ? '취소' : '그만하기' : '말해서 입력'}
    disabled={!active && (disabled || speech.busy)}
    onClick={() => active ? speech.state.phase === 'stopping' ? speech.cancel() : speech.stop() : speech.start(target)}>
    {waiting ? <LoaderCircle size={20} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : active ? <Square size={14} fill="currentColor" strokeWidth={0} aria-hidden="true" /> : <Mic size={20} strokeWidth={1.75} aria-hidden="true" />}
  </Button>;
}

export function SpeechInputFeedback({ speech, target, id }: { speech: SpeechInput; target: SpeechTarget; id: string }) {
  const selected = speech.target?.eventId === target.eventId && speech.target.field === target.field;
  const text = !selected ? '' : speech.state.phase === 'starting' ? '마이크 연결 중… 권한 요청이 나오면 허용해주세요.'
    : speech.state.phase === 'stopping' ? '마지막 말을 정리하고 있어요… 다시 누르면 취소돼요.'
    : speech.state.phase === 'listening' ? `듣는 중… ${speech.state.interim || '편하게 말씀해주세요.'}` : speech.state.message;
  return <p id={id} role="status" aria-live="polite" aria-atomic="true" className="text-sm text-muted-foreground empty:hidden">{text}</p>;
}
