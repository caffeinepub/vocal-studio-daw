import { useEffect, useRef, useState } from "react";
import { useDAWStore } from "../store/useDAWStore";
import type { AudioClip, Track } from "../types";

interface TrackLaneProps {
  track: Track;
  width: number;
  scrollX: number;
}

function hexToRgba(hex: string, alpha: number) {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawClip(
  ctx: CanvasRenderingContext2D,
  clip: AudioClip,
  zoom: number,
  scrollX: number,
  height: number,
  color: string,
  isHovered: boolean,
) {
  const x = clip.startTime * zoom - scrollX;
  const w = clip.duration * zoom;
  const endX = x + w;

  if (endX < 0 || x > ctx.canvas.width) return;

  const clipX = Math.max(0, x);
  const clipW = Math.min(ctx.canvas.width, endX) - clipX;
  if (clipW <= 0) return;

  // Background
  ctx.fillStyle = hexToRgba(color, isHovered ? 0.35 : 0.25);
  ctx.fillRect(clipX, 1, clipW, height - 2);

  // Top border
  ctx.fillStyle = color;
  ctx.fillRect(clipX, 1, clipW, 2);

  // Left border
  if (x >= 0) {
    ctx.fillRect(x, 1, 2, height - 2);
  }

  // Waveform
  if (clip.audioBuffer) {
    const data = clip.audioBuffer.getChannelData(0);
    const startSample = Math.max(
      0,
      Math.floor((-x / zoom) * clip.audioBuffer.sampleRate),
    );
    const samplesPerPixel = Math.max(
      1,
      Math.floor(clip.audioBuffer.sampleRate / zoom),
    );

    ctx.strokeStyle = hexToRgba(color, 0.9);
    ctx.lineWidth = 1;
    ctx.beginPath();

    const drawStart = Math.max(0, Math.floor(x));
    const drawEnd = Math.min(ctx.canvas.width, Math.ceil(endX));

    for (let px = drawStart; px < drawEnd; px++) {
      const pixOffset = px - Math.floor(x);
      const sampleIdx = startSample + pixOffset * samplesPerPixel;
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < samplesPerPixel; j++) {
        const s = data[sampleIdx + j] ?? 0;
        if (s < min) min = s;
        if (s > max) max = s;
      }
      const amp = (height - 4) / 2;
      const mid = height / 2;
      ctx.moveTo(px + 0.5, mid + min * amp);
      ctx.lineTo(px + 0.5, mid + max * amp);
    }
    ctx.stroke();
  }

  // Clip name
  if (clipW > 30 && x >= 0) {
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "10px Inter, sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText(clip.name, clipX + 4, 6);
  }
}

export function TrackLane({ track, width, scrollX }: TrackLaneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { zoom, updateClip, selectTrack } = useDAWStore();
  const LANE_HEIGHT = 56;
  const [hoveredClipId, setHoveredClipId] = useState<string | null>(null);
  const dragRef = useRef<{
    clipId: string;
    startX: number;
    origStart: number;
  } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, LANE_HEIGHT);
    ctx.fillStyle = "#1B1F24";
    ctx.fillRect(0, 0, width, LANE_HEIGHT);

    // Subtle grid lines
    ctx.strokeStyle = "#232A31";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, LANE_HEIGHT - 1);
    ctx.lineTo(width, LANE_HEIGHT - 1);
    ctx.stroke();

    for (const clip of track.clips) {
      drawClip(
        ctx,
        clip,
        zoom,
        scrollX,
        LANE_HEIGHT,
        track.color,
        clip.id === hoveredClipId,
      );
    }
  }, [track.clips, track.color, zoom, scrollX, width, hoveredClipId]);

  const getClipAtX = (canvasX: number) => {
    const timePos = (canvasX + scrollX) / zoom;
    return track.clips.find(
      (c) => timePos >= c.startTime && timePos <= c.startTime + c.duration,
    );
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    selectTrack(track.id);
    const rect = e.currentTarget.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const clip = getClipAtX(canvasX);
    if (!clip) return;
    dragRef.current = {
      clipId: clip.id,
      startX: e.clientX,
      origStart: clip.startTime,
    };
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const clip = getClipAtX(canvasX);
    setHoveredClipId(clip?.id ?? null);

    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const newStart = Math.max(0, dragRef.current.origStart + dx / zoom);
    updateClip(track.id, dragRef.current.clipId, { startTime: newStart });
  };

  const handleMouseUp = () => {
    dragRef.current = null;
  };

  const handleMouseLeave = () => {
    setHoveredClipId(null);
    dragRef.current = null;
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={LANE_HEIGHT}
      className="timeline-clip block shrink-0"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      style={{ display: "block" }}
    />
  );
}
