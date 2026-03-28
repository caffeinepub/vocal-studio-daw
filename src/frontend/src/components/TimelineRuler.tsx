import { useEffect, useRef } from "react";
import { useDAWStore } from "../store/useDAWStore";

interface TimelineRulerProps {
  width: number;
  scrollX: number;
  onSeek: (time: number) => void;
}

export function TimelineRuler({ width, scrollX, onSeek }: TimelineRulerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { zoom, bpm } = useDAWStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = "#1B1F24";
    ctx.fillRect(0, 0, width, height);

    const secondsPerBeat = 60 / bpm;
    const pixelsPerBeat = secondsPerBeat * zoom;
    const pixelsPerBar = pixelsPerBeat * 4;

    ctx.fillStyle = "#A9B3BD";
    ctx.font = "10px Inter, sans-serif";
    ctx.textBaseline = "top";

    const startTime = scrollX / zoom;
    const endTime = startTime + width / zoom;

    const firstBar = Math.floor(startTime / secondsPerBeat / 4);
    const lastBar = Math.ceil(endTime / secondsPerBeat / 4) + 1;

    for (let bar = firstBar; bar <= lastBar; bar++) {
      const barTime = bar * 4 * secondsPerBeat;
      const x = barTime * zoom - scrollX;
      if (x < -pixelsPerBar || x > width + pixelsPerBar) continue;

      ctx.strokeStyle = "#3A444E";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      if (x >= 0 && x <= width) {
        ctx.fillStyle = "#A9B3BD";
        ctx.fillText(`${bar + 1}`, x + 3, 3);
      }

      for (let beat = 1; beat < 4; beat++) {
        const beatTime = barTime + beat * secondsPerBeat;
        const bx = beatTime * zoom - scrollX;
        if (bx < 0 || bx > width) continue;
        ctx.strokeStyle = "#2A3139";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(bx, height / 2);
        ctx.lineTo(bx, height);
        ctx.stroke();
      }
    }

    const secInterval = zoom >= 80 ? 1 : zoom >= 40 ? 2 : zoom >= 20 ? 5 : 10;
    const firstSec = Math.floor(startTime / secInterval) * secInterval;
    for (let t = firstSec; t <= endTime + secInterval; t += secInterval) {
      const x = t * zoom - scrollX;
      if (x < 0 || x > width) continue;
      const mins = Math.floor(t / 60);
      const secs = Math.floor(t % 60);
      const label = `${mins}:${secs.toString().padStart(2, "0")}`;
      ctx.fillStyle = "#A9B3BD";
      ctx.fillText(label, x + 2, height - 13);
    }

    ctx.strokeStyle = "#3A444E";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height - 1);
    ctx.lineTo(width, height - 1);
    ctx.stroke();
  }, [width, scrollX, zoom, bpm]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollX;
    const time = x / zoom;
    onSeek(Math.max(0, time));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      onSeek(0);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={32}
      className="cursor-pointer shrink-0"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label="Timeline ruler - click to seek"
      style={{ display: "block" }}
    />
  );
}
