// Local feedback only: no recording, upload, or playback of microphone audio.
export function createSpeechAudio(onAnalyser: (analyser: AnalyserNode) => void) {
  let context: AudioContext;
  try {
    context = new AudioContext();
    void context.resume().catch(() => {});
  } catch { return null; }

  let stream: MediaStream | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let closed = false;
  let started = false;
  let finishing = false;
  let captureStopped = false;

  const stopMeter = () => {
    captureStopped = true;
    stream?.getTracks().forEach(track => track.stop());
    source?.disconnect();
    stream = null;
    source = null;
  };
  const dispose = () => {
    if (closed) return;
    closed = true;
    stopMeter();
    void context.close().catch(() => {});
  };
  const tone = (from: number, to: number, onEnd?: () => void) => {
    // Muted or blocked audio must never prevent dictation.
    if (closed || context.state !== 'running') { onEnd?.(); return; }
    try {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const now = context.currentTime;
      oscillator.frequency.setValueAtTime(from, now);
      oscillator.frequency.exponentialRampToValueAtTime(to, now + 0.12);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.045, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      oscillator.connect(gain).connect(context.destination);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); onEnd?.(); };
      oscillator.start(now);
      oscillator.stop(now + 0.18);
    } catch { onEnd?.(); }
  };

  return {
    start() {
      if (closed || started || finishing) return;
      started = true;
      tone(660, 880);
      // SpeechRecognition does not expose levels. This second, local-only stream
      // supplies the waveform and is released even if permission resolves late.
      void navigator.mediaDevices?.getUserMedia({ audio: true }).then(media => {
        if (closed || captureStopped) { media.getTracks().forEach(track => track.stop()); return; }
        stream = media;
        try {
          source = context.createMediaStreamSource(media);
          const analyser = context.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser); // Never connect microphone audio to speakers.
          onAnalyser(analyser);
        } catch { stopMeter(); }
      }).catch(() => { /* Waveform is optional; recognition remains usable. */ });
    },
    stopMeter,
    finish() {
      if (closed || finishing) return;
      finishing = true;
      stopMeter();
      if (started) tone(520, 380, dispose);
      else dispose();
    },
    dispose,
  };
}
