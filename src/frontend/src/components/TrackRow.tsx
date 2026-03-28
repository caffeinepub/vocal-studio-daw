import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronUp,
  Mic,
  SlidersHorizontal,
  Square,
  Volume2,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { audioEngine } from "../audio/AudioEngine";
import { useDAWStore } from "../store/useDAWStore";
import type { Track } from "../types";
import { WaveformCanvas } from "./WaveformCanvas";

interface TrackRowProps {
  track: Track;
  index: number;
}

export function TrackRow({ track, index }: TrackRowProps) {
  const {
    renameTrack,
    removeTrack,
    reorderTrack,
    setTrackVolume,
    toggleMute,
    toggleSolo,
    tracks,
    setEffectsTrackId,
    selectTrack,
    selectedTrackId,
    addClip,
  } = useDAWStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(track.name);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const isSelected = selectedTrackId === track.id;

  const handleFinishRename = () => {
    setIsEditing(false);
    if (editName.trim()) renameTrack(track.id, editName.trim());
    else setEditName(track.name);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await audioEngine.resume();
      audioEngine.initTrackNodes(track.id, track.volume, track.pan);
      const buf = await audioEngine.loadAudioFile(file);
      addClip(track.id, {
        name: file.name.replace(/\.[^.]+$/, ""),
        audioBuffer: buf,
        startTime: 0,
        duration: buf.duration,
        color: track.color,
      });
    } catch (err) {
      console.error("Failed to load audio:", err);
    }
    e.target.value = "";
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        try {
          const arrayBuffer = await blob.arrayBuffer();
          const audioCtx = new AudioContext();
          const buf = await audioCtx.decodeAudioData(arrayBuffer);
          if (track.clips.length === 0) {
            audioEngine.initTrackNodes(track.id, track.volume, track.pan);
          }
          addClip(track.id, {
            name: "Recording",
            audioBuffer: buf,
            startTime: 0,
            duration: buf.duration,
            color: track.color,
          });
          toast.success("Recording added to track");
        } catch (err) {
          console.error("Failed to process recording:", err);
          toast.error("Failed to process recording");
        }
        for (const t of streamRef.current?.getTracks() ?? []) {
          t.stop();
        }
        streamRef.current = null;
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast("Recording started");
    } catch {
      toast.error("Microphone permission denied");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const firstClip = track.clips[0] ?? null;

  return (
    <div
      className={cn(
        "flex items-center h-14 px-2 gap-2 border-b border-border transition-colors",
        isSelected ? "bg-accent" : "bg-card hover:bg-secondary",
      )}
      data-ocid={`track.item.${index + 1}`}
    >
      {/* Color strip + name = select button */}
      <button
        type="button"
        className="flex items-center gap-2 flex-1 min-w-0 text-left h-full bg-transparent border-0 p-0 cursor-pointer"
        onClick={() => selectTrack(track.id)}
        aria-label={`Select track ${track.name}`}
      >
        <div
          className="w-1 h-10 rounded-full shrink-0"
          style={{ background: track.color }}
        />
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              className="bg-input text-foreground text-xs px-1 py-0.5 rounded w-full outline-none border border-primary"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleFinishRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleFinishRename();
                if (e.key === "Escape") {
                  setIsEditing(false);
                  setEditName(track.name);
                }
              }}
              onClick={(e) => e.stopPropagation()}
              data-ocid={`track.input.${index + 1}`}
            />
          ) : (
            <span
              className="text-xs text-foreground font-medium truncate block"
              onDoubleClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
            >
              {track.name}
            </span>
          )}
          {/* Mini waveform click to upload */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                fileInputRef.current?.click();
              }
            }}
            title="Click to upload audio"
          >
            <WaveformCanvas
              audioBuffer={firstClip?.audioBuffer ?? null}
              color={track.color}
              width={80}
              height={14}
              className="opacity-70"
            />
          </div>
        </div>
      </button>

      {/* Controls */}
      <div className="flex items-center gap-1">
        <div className="flex items-center gap-1">
          <Volume2 size={10} className="text-muted-foreground" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={track.volume}
            onChange={(e) =>
              setTrackVolume(track.id, Number.parseFloat(e.target.value))
            }
            className="w-14 h-1 accent-primary cursor-pointer"
            data-ocid={`track.input.${index + 1}`}
          />
        </div>

        <button
          type="button"
          className={cn(
            "w-6 h-6 rounded text-[10px] font-bold transition-colors",
            track.muted
              ? "bg-destructive text-destructive-foreground"
              : "bg-secondary text-muted-foreground hover:text-foreground",
          )}
          onClick={() => toggleMute(track.id)}
          data-ocid={`track.toggle.${index + 1}`}
          title="Mute"
        >
          M
        </button>

        <button
          type="button"
          className={cn(
            "w-6 h-6 rounded text-[10px] font-bold transition-colors",
            track.soloed
              ? "bg-daw-orange text-white"
              : "bg-secondary text-muted-foreground hover:text-foreground",
          )}
          onClick={() => toggleSolo(track.id)}
          title="Solo"
        >
          S
        </button>

        <button
          type="button"
          className="w-6 h-6 rounded bg-secondary text-muted-foreground hover:text-primary transition-colors"
          onClick={() => setEffectsTrackId(track.id)}
          title="Effects"
          data-ocid={`track.button.${index + 1}`}
        >
          <SlidersHorizontal size={10} className="m-auto" />
        </button>

        {/* Record button */}
        <button
          type="button"
          className={cn(
            "w-6 h-6 rounded transition-colors flex items-center justify-center",
            isRecording
              ? "animate-pulse bg-destructive text-destructive-foreground"
              : "bg-secondary text-muted-foreground hover:text-primary",
          )}
          onClick={() => (isRecording ? stopRecording() : startRecording())}
          title={isRecording ? "Stop recording" : "Record"}
          data-ocid={`track.toggle.${index + 1}`}
        >
          {isRecording ? <Square size={10} /> : <Mic size={10} />}
        </button>

        <div className="flex flex-col">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => reorderTrack(track.id, "up")}
            disabled={index === 0}
            aria-label="Move track up"
          >
            <ChevronUp size={10} />
          </button>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => reorderTrack(track.id, "down")}
            disabled={index === tracks.length - 1}
            aria-label="Move track down"
          >
            <ChevronDown size={10} />
          </button>
        </div>

        <button
          type="button"
          className="text-muted-foreground hover:text-destructive transition-colors"
          onClick={() => removeTrack(track.id)}
          data-ocid={`track.delete_button.${index + 1}`}
          title="Delete track"
        >
          <X size={12} />
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleFileUpload}
        data-ocid={`track.upload_button.${index + 1}`}
      />
    </div>
  );
}
