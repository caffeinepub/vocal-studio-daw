import { useEffect, useRef } from "react";

interface WaveformCanvasProps {
  audioBuffer: AudioBuffer | null;
  color: string;
  width: number;
  height: number;
  className?: string;
}

export function WaveformCanvas({
  audioBuffer,
  color,
  width,
  height,
  className,
}: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    if (!audioBuffer) {
      ctx.strokeStyle = `${color}40`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      return;
    }

    const data = audioBuffer.getChannelData(0);
    const step = Math.max(1, Math.ceil(data.length / width));
    const amp = height / 2;

    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let x = 0; x < width; x++) {
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j++) {
        const sample = data[x * step + j] ?? 0;
        if (sample < min) min = sample;
        if (sample > max) max = sample;
      }
      const y1 = (1 + min) * amp;
      const y2 = (1 + max) * amp;
      ctx.moveTo(x + 0.5, y1);
      ctx.lineTo(x + 0.5, y2);
    }

    ctx.stroke();
  }, [audioBuffer, color, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
      style={{ display: "block" }}
    />
  );
}
