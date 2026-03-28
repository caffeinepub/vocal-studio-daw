import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { audioEngine } from "../audio/AudioEngine";
import { useDAWStore } from "../store/useDAWStore";

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
}

type ExportScope = "mix" | "individual";
type ExportFormat = "wav" | "mp4";

export function ExportModal({ open, onClose }: ExportModalProps) {
  const { tracks, totalDuration } = useDAWStore();
  const [scope, setScope] = useState<ExportScope>("mix");
  const [format, setFormat] = useState<ExportFormat>("wav");
  const [progress, setProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const exportWAV = async (tracksToExport: typeof tracks, name: string) => {
    const buf = await audioEngine.renderOffline(tracksToExport, totalDuration);
    const blob = audioEngine.audioBufferToWAV(buf);
    downloadBlob(blob, `${name}.wav`);
  };

  const exportMP4 = async (tracksToExport: typeof tracks, name: string) => {
    const audioBuf = await audioEngine.renderOffline(
      tracksToExport,
      totalDuration,
    );

    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    const ctx2d = canvas.getContext("2d")!;

    ctx2d.fillStyle = "#1B1F24";
    ctx2d.fillRect(0, 0, 1280, 720);
    ctx2d.fillStyle = "#27C7B8";
    ctx2d.font = "bold 32px Inter, sans-serif";
    ctx2d.textAlign = "center";
    ctx2d.fillText(name, 640, 80);

    const data = audioBuf.getChannelData(0);
    const step = Math.ceil(data.length / 1280);
    const amp = 280;
    const mid = 360;

    ctx2d.strokeStyle = "#27C7B8";
    ctx2d.lineWidth = 1.5;
    ctx2d.beginPath();
    for (let x = 0; x < 1280; x++) {
      let min = 1;
      let max = -1;
      for (let j = 0; j < step; j++) {
        const s = data[x * step + j] ?? 0;
        if (s < min) min = s;
        if (s > max) max = s;
      }
      ctx2d.moveTo(x, mid + min * amp);
      ctx2d.lineTo(x, mid + max * amp);
    }
    ctx2d.stroke();

    const audioCtx = new AudioContext();
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuf;
    const dest = audioCtx.createMediaStreamDestination();
    source.connect(dest);

    const canvasStream = canvas.captureStream(30);
    for (const audioTrack of dest.stream.getAudioTracks()) {
      canvasStream.addTrack(audioTrack);
    }

    const recorder = new MediaRecorder(canvasStream, {
      mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : "video/webm",
    });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    await new Promise<void>((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        downloadBlob(blob, `${name}.webm`);
        resolve();
      };
      recorder.start();
      source.start();
      source.onended = () => recorder.stop();
    });

    await audioCtx.close();
  };

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    setProgress(10);

    try {
      await audioEngine.resume();

      if (scope === "mix") {
        setProgress(30);
        if (format === "wav") {
          await exportWAV(tracks, "vocal-studio-mix");
        } else {
          await exportMP4(tracks, "Vocal Studio Mix");
        }
        setProgress(100);
      } else {
        const tracksWithAudio = tracks.filter((t) =>
          t.clips.some((c) => c.audioBuffer),
        );
        for (let i = 0; i < tracksWithAudio.length; i++) {
          setProgress(Math.round((i / tracksWithAudio.length) * 90) + 10);
          const t = tracksWithAudio[i];
          if (format === "wav") {
            await exportWAV([t], t.name.toLowerCase().replace(/\s+/g, "-"));
          } else {
            await exportMP4([t], t.name);
          }
        }
        setProgress(100);
      }
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-md bg-card border-border text-foreground"
        data-ocid="export.dialog"
      >
        <DialogHeader>
          <DialogTitle className="text-foreground">Export Audio</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Scope */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Export
            </p>
            <div className="flex gap-2">
              {(["mix", "individual"] as ExportScope[]).map((s) => (
                <button
                  type="button"
                  key={s}
                  className={cn(
                    "flex-1 py-2 rounded text-sm transition-colors",
                    scope === s
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setScope(s)}
                  data-ocid="export.button"
                >
                  {s === "mix" ? "Full Mix" : "Individual Tracks"}
                </button>
              ))}
            </div>
          </div>

          {/* Format */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Format
            </p>
            <div className="flex gap-2">
              {(["wav", "mp4"] as ExportFormat[]).map((f) => (
                <button
                  type="button"
                  key={f}
                  className={cn(
                    "flex-1 py-2 rounded text-sm uppercase transition-colors",
                    format === f
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setFormat(f)}
                  data-ocid="export.button"
                >
                  {f === "wav" ? "WAV" : "WebM/Video"}
                </button>
              ))}
            </div>
          </div>

          {isExporting && (
            <div className="space-y-2" data-ocid="export.loading_state">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                Exporting... {progress}%
              </p>
            </div>
          )}

          {error && (
            <p
              className="text-xs text-destructive"
              data-ocid="export.error_state"
            >
              {error}
            </p>
          )}

          {progress === 100 && !isExporting && (
            <p
              className="text-xs text-primary text-center"
              data-ocid="export.success_state"
            >
              ✓ Export complete! Check your downloads.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="bg-secondary border-border text-foreground"
            data-ocid="export.cancel_button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="bg-primary text-primary-foreground"
            data-ocid="export.primary_button"
          >
            {isExporting ? "Exporting..." : "Export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
