import { useEffect, useRef } from "react";
import { audioEngine } from "../audio/AudioEngine";
import { useDAWStore } from "../store/useDAWStore";

export function MasterSection() {
  const { masterVolume, masterEQ, setMasterVolume, setMasterEQ } =
    useDAWStore();
  const meterCanvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const draw = () => {
      const canvas = meterCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const data = audioEngine.getAnalyserData();
      const w = canvas.width;
      const h = canvas.height;

      ctx.fillStyle = "#1B1F24";
      ctx.fillRect(0, 0, w, h);

      if (data.length === 0) {
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      // Draw frequency bars (2 channel meters simulated)
      const barW = 10;
      const gap = 4;
      const numBars = Math.floor(w / (barW + gap));
      const step = Math.floor(data.length / numBars);

      for (let i = 0; i < numBars; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) {
          sum += data[i * step + j] ?? 0;
        }
        const avg = sum / step / 255;
        const barH = avg * h;
        const x = i * (barW + gap);
        const y = h - barH;

        // Color gradient: green → yellow → red
        const hue = avg > 0.8 ? "#E24B4B" : avg > 0.6 ? "#D7C34A" : "#3EE17C";
        ctx.fillStyle = hue;
        ctx.fillRect(x, y, barW, barH);
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <div
      className="flex items-stretch gap-4 px-4 py-3 bg-card border-t border-border shrink-0 h-40"
      data-ocid="mixer.panel"
    >
      {/* VU Meter */}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Meter</span>
        <canvas
          ref={meterCanvasRef}
          width={180}
          height={80}
          className="rounded bg-background"
          style={{ display: "block" }}
        />
      </div>

      {/* Master Volume */}
      <div className="flex flex-col gap-1 min-w-[120px]">
        <span className="text-xs text-muted-foreground">Master Volume</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={masterVolume}
          onChange={(e) => setMasterVolume(Number.parseFloat(e.target.value))}
          className="accent-primary"
          data-ocid="mixer.input"
        />
        <span className="text-xs text-foreground">
          {Math.round(masterVolume * 100)}%
        </span>
      </div>

      {/* EQ Section */}
      <div className="flex gap-4 flex-1">
        {[
          { label: "Low", band: "low" as const, freq: "200Hz" },
          { label: "Mid", band: "mid" as const, freq: "1kHz" },
          { label: "High", band: "high" as const, freq: "5kHz" },
        ].map(({ label, band, freq }) => (
          <div key={band} className="flex flex-col items-center gap-1">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="text-[10px] text-muted-foreground">{freq}</span>
            <input
              type="range"
              min={-12}
              max={12}
              step={0.5}
              value={masterEQ[band]}
              onChange={(e) =>
                setMasterEQ(band, Number.parseFloat(e.target.value))
              }
              className="h-16 accent-primary"
              style={{ writingMode: "vertical-lr", direction: "rtl" }}
              data-ocid="mixer.input"
            />
            <span className="text-xs text-foreground font-mono">
              {masterEQ[band] >= 0 ? "+" : ""}
              {masterEQ[band].toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
