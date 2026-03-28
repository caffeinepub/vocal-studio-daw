import { cn } from "@/lib/utils";
import {
  Download,
  Pause,
  Play,
  Repeat,
  SkipBack,
  Sliders,
  Square,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { audioEngine } from "../audio/AudioEngine";
import { useDAWStore } from "../store/useDAWStore";

function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  const ms = Math.floor((secs % 1) * 1000);
  return `${m}:${s.toString().padStart(2, "00")}.${ms.toString().padStart(3, "000")}`;
}

interface TransportBarProps {
  onExport: () => void;
}

export function TransportBar({ onExport }: TransportBarProps) {
  const {
    isPlaying,
    isLooping,
    currentTime,
    tracks,
    zoom,
    setZoom,
    toggleLoop,
    setPlaying,
    setCurrentTime,
    activePanel,
    setActivePanel,
    bpm,
    setBPM,
  } = useDAWStore();

  const handlePlay = async () => {
    await audioEngine.resume();
    for (const track of tracks) {
      audioEngine.initTrackNodes(track.id, track.volume, track.pan);
    }
    audioEngine.startPlayback(tracks, currentTime);
    setPlaying(true);
  };

  const handlePause = () => {
    audioEngine.stopPlayback();
    setPlaying(false);
  };

  const handleStop = () => {
    audioEngine.stopPlayback();
    audioEngine.seekTo(0);
    setPlaying(false);
    setCurrentTime(0);
  };

  const handleRewind = () => {
    audioEngine.seekTo(0);
    setCurrentTime(0);
    if (isPlaying) {
      audioEngine.startPlayback(tracks, 0);
    }
  };

  return (
    <div
      className="flex items-center gap-4 px-4 h-14 bg-card border-t border-border shrink-0"
      data-ocid="transport.panel"
    >
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground transition-colors"
        onClick={handleRewind}
        title="Rewind to start"
        data-ocid="transport.button"
      >
        <SkipBack size={18} />
      </button>

      {isPlaying ? (
        <button
          type="button"
          className="w-9 h-9 rounded-full bg-primary flex items-center justify-center hover:opacity-90 transition-opacity"
          onClick={handlePause}
          data-ocid="transport.primary_button"
          title="Pause"
        >
          <Pause size={16} className="text-primary-foreground" />
        </button>
      ) : (
        <button
          type="button"
          className="w-9 h-9 rounded-full bg-primary flex items-center justify-center hover:opacity-90 transition-opacity"
          onClick={handlePlay}
          data-ocid="transport.primary_button"
          title="Play"
        >
          <Play
            size={16}
            className="text-primary-foreground fill-primary-foreground"
          />
        </button>
      )}

      <button
        type="button"
        className="text-muted-foreground hover:text-foreground transition-colors"
        onClick={handleStop}
        title="Stop"
        data-ocid="transport.secondary_button"
      >
        <Square size={16} />
      </button>

      <button
        type="button"
        className={cn(
          "transition-colors",
          isLooping
            ? "text-primary"
            : "text-muted-foreground hover:text-foreground",
        )}
        onClick={toggleLoop}
        title="Loop"
        data-ocid="transport.toggle"
      >
        <Repeat size={16} />
      </button>

      <div className="font-mono text-2xl font-medium text-foreground tracking-wider tabular-nums min-w-[140px]">
        {formatTime(currentTime)}
      </div>

      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">BPM</span>
        <input
          type="number"
          value={bpm}
          min={40}
          max={300}
          onChange={(e) => setBPM(Number.parseInt(e.target.value) || 120)}
          className="w-14 bg-input text-foreground text-sm text-center rounded px-1 py-0.5 border border-border outline-none focus:border-primary"
          data-ocid="transport.input"
        />
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setZoom(zoom / 1.3)}
          title="Zoom out"
        >
          <ZoomOut size={16} />
        </button>
        <span className="text-xs text-muted-foreground w-10 text-center">
          {zoom.toFixed(0)}px
        </span>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setZoom(zoom * 1.3)}
          title="Zoom in"
        >
          <ZoomIn size={16} />
        </button>
      </div>

      <button
        type="button"
        className={cn(
          "flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors",
          activePanel === "mixer"
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-muted-foreground hover:text-foreground",
        )}
        onClick={() =>
          setActivePanel(activePanel === "mixer" ? "timeline" : "mixer")
        }
        data-ocid="transport.toggle"
        title="Mixer"
      >
        <Sliders size={14} />
        <span className="hidden sm:inline">Mixer</span>
      </button>

      <button
        type="button"
        className="flex items-center gap-1 px-3 py-1 rounded bg-primary text-primary-foreground text-xs hover:opacity-90 transition-opacity"
        onClick={onExport}
        data-ocid="transport.button"
        title="Export"
      >
        <Download size={14} />
        Export
      </button>
    </div>
  );
}
