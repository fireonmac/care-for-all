import { useEffect, useRef } from 'react';

// Draw the microphone's recent volume without re-rendering the form every frame.
export function SpeechWaveform({ analyser }: { analyser: AnalyserNode | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const samples = analyser ? new Uint8Array(analyser.fftSize) : null;
    const levels: number[] = [];
    let frame = 0;
    let lastSample = 0;
    let width = 0;
    const draw = () => {
      context.clearRect(0, 0, width, 32);
      context.fillStyle = getComputedStyle(canvas).color;
      const count = Math.floor(width / 7);
      for (let i = 0; i < count; i++) {
        const level = levels[levels.length - count + i] ?? 0;
        const height = Math.max(3, Math.min(26, level * 100));
        context.globalAlpha = height > 3 ? 0.8 : 0.3;
        context.beginPath();
        context.roundRect((width - count * 7) / 2 + i * 7, (32 - height) / 2, 3, height, 1.5);
        context.fill();
      }
    };
    const resize = () => {
      width = canvas.clientWidth;
      const scale = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * scale);
      canvas.height = 32 * scale;
      context.setTransform(scale, 0, 0, scale, 0, 0);
      draw();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    const tick = (time: number) => {
      if (analyser && samples && time - lastSample >= 70) {
        analyser.getByteTimeDomainData(samples);
        const energy = samples.reduce((total, value) => total + ((value - 128) / 128) ** 2, 0);
        levels.push(Math.sqrt(energy / samples.length));
        if (levels.length > Math.ceil(width / 7)) levels.shift();
        draw();
        lastSample = time;
      }
      frame = requestAnimationFrame(tick);
    };
    if (analyser && !reducedMotion) frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [analyser]);
  return <canvas ref={canvasRef} aria-hidden="true" className="block h-8 w-full text-muted-foreground" />;
}
