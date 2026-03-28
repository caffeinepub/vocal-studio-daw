import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { audioEngine } from "../audio/AudioEngine";
import { useDAWStore } from "../store/useDAWStore";

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const SCALES = ["Major", "Minor", "Chromatic", "Pentatonic"];

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-20">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number.parseFloat(e.target.value))}
        className="flex-1 accent-primary h-1"
      />
      <span className="text-xs font-mono text-foreground w-12 text-right">
        {format ? format(value) : value.toFixed(2)}
      </span>
    </div>
  );
}

export function EffectsPanel() {
  const {
    tracks,
    effectsTrackId,
    setEffectsTrackId,
    updateEffects,
    addTake,
    updateTake,
    removeTake,
    flattenTakes,
  } = useDAWStore();

  const track = tracks.find((t) => t.id === effectsTrackId);
  const [activeTab, setActiveTab] = useState("reverb");

  if (!track) return null;

  const updateReverb = (key: string, val: number | boolean) => {
    const newReverb = { ...track.effects.reverb, [key]: val };
    updateEffects(track.id, { reverb: newReverb });
    audioEngine.updateReverb(
      track.id,
      newReverb.roomSize,
      newReverb.decay,
      newReverb.wet,
      newReverb.enabled,
    );
  };

  const updateGate = (key: string, val: number | boolean) => {
    updateEffects(track.id, {
      noiseGate: { ...track.effects.noiseGate, [key]: val },
    });
  };

  const updatePitch = (key: string, val: number | boolean | string) => {
    updateEffects(track.id, {
      pitchCorrection: { ...track.effects.pitchCorrection, [key]: val },
    });
  };

  const handleTakeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !track) return;
    try {
      const buf = await audioEngine.loadAudioFile(file);
      addTake(track.id, {
        name: file.name.replace(/\.[^.]+$/, ""),
        audioBuffer: buf,
        selected: false,
      });
    } catch (err) {
      console.error(err);
    }
    e.target.value = "";
  };

  return (
    <Dialog
      open={!!effectsTrackId}
      onOpenChange={(o) => !o && setEffectsTrackId(null)}
    >
      <DialogContent
        className="max-w-xl bg-card border-border text-foreground"
        data-ocid="effects.dialog"
      >
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ background: track.color }}
            />
            Effects — {track.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-secondary w-full">
            <TabsTrigger
              value="reverb"
              className="flex-1"
              data-ocid="effects.tab"
            >
              Reverb
            </TabsTrigger>
            <TabsTrigger
              value="gate"
              className="flex-1"
              data-ocid="effects.tab"
            >
              Noise Gate
            </TabsTrigger>
            <TabsTrigger
              value="pitch"
              className="flex-1"
              data-ocid="effects.tab"
            >
              Pitch
            </TabsTrigger>
            <TabsTrigger
              value="comping"
              className="flex-1"
              data-ocid="effects.tab"
            >
              Comping
            </TabsTrigger>
          </TabsList>

          {/* Reverb */}
          <TabsContent value="reverb" className="space-y-4 pt-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={track.effects.reverb.enabled}
                onCheckedChange={(v) => updateReverb("enabled", v)}
                id="reverb-enabled"
                data-ocid="effects.switch"
              />
              <Label htmlFor="reverb-enabled" className="text-foreground">
                Enable Reverb
              </Label>
            </div>
            <SliderRow
              label="Room Size"
              value={track.effects.reverb.roomSize}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => updateReverb("roomSize", v)}
            />
            <SliderRow
              label="Decay"
              value={track.effects.reverb.decay}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => updateReverb("decay", v)}
            />
            <SliderRow
              label="Wet/Dry"
              value={track.effects.reverb.wet}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => updateReverb("wet", v)}
            />
          </TabsContent>

          {/* Noise Gate */}
          <TabsContent value="gate" className="space-y-4 pt-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={track.effects.noiseGate.enabled}
                onCheckedChange={(v) => updateGate("enabled", v)}
                id="gate-enabled"
                data-ocid="effects.switch"
              />
              <Label htmlFor="gate-enabled" className="text-foreground">
                Enable Noise Gate
              </Label>
            </div>
            <SliderRow
              label="Threshold"
              value={track.effects.noiseGate.threshold}
              min={-60}
              max={0}
              step={1}
              onChange={(v) => updateGate("threshold", v)}
              format={(v) => `${v} dB`}
            />
            <SliderRow
              label="Ratio"
              value={track.effects.noiseGate.ratio}
              min={1}
              max={20}
              step={0.5}
              onChange={(v) => updateGate("ratio", v)}
              format={(v) => `${v}:1`}
            />
            <p className="text-xs text-muted-foreground">
              Noise gate applies a dynamics compressor with the given threshold
              and ratio to reduce background noise.
            </p>
          </TabsContent>

          {/* Pitch Correction */}
          <TabsContent value="pitch" className="space-y-4 pt-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={track.effects.pitchCorrection.enabled}
                onCheckedChange={(v) => updatePitch("enabled", v)}
                id="pitch-enabled"
                data-ocid="effects.switch"
              />
              <Label htmlFor="pitch-enabled" className="text-foreground">
                Enable Pitch Correction
              </Label>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-20">Key</span>
              <Select
                value={track.effects.pitchCorrection.key}
                onValueChange={(v) => updatePitch("key", v)}
              >
                <SelectTrigger
                  className="flex-1 bg-secondary border-border text-foreground"
                  data-ocid="effects.select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {NOTES.map((n) => (
                    <SelectItem key={n} value={n} className="text-foreground">
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-20">Scale</span>
              <Select
                value={track.effects.pitchCorrection.scale}
                onValueChange={(v) => updatePitch("scale", v)}
              >
                <SelectTrigger
                  className="flex-1 bg-secondary border-border text-foreground"
                  data-ocid="effects.select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {SCALES.map((s) => (
                    <SelectItem key={s} value={s} className="text-foreground">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <SliderRow
              label="Strength"
              value={track.effects.pitchCorrection.strength}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => updatePitch("strength", v)}
              format={(v) => `${Math.round(v * 100)}%`}
            />
          </TabsContent>

          {/* Comping */}
          <TabsContent value="comping" className="space-y-3 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground font-medium">Takes</span>
              <div className="flex gap-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={handleTakeUpload}
                    data-ocid="effects.upload_button"
                  />
                  <span className="px-2 py-1 rounded bg-secondary text-xs text-foreground hover:bg-accent transition-colors">
                    + Import Take
                  </span>
                </label>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 bg-secondary border-border text-foreground"
                  onClick={() => flattenTakes(track.id)}
                  data-ocid="effects.primary_button"
                >
                  Flatten to Clip
                </Button>
              </div>
            </div>

            {track.takes.length === 0 ? (
              <div
                className="text-xs text-muted-foreground py-4 text-center"
                data-ocid="effects.empty_state"
              >
                No takes yet. Import audio files as takes.
              </div>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {track.takes.map((take, i) => (
                  <div
                    key={take.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded bg-secondary"
                    data-ocid={`effects.item.${i + 1}`}
                  >
                    <input
                      type="checkbox"
                      checked={take.selected}
                      onChange={(e) =>
                        updateTake(track.id, take.id, {
                          selected: e.target.checked,
                        })
                      }
                      className="accent-primary"
                    />
                    <span className="flex-1 text-xs text-foreground truncate">
                      {take.name}
                    </span>
                    {take.audioBuffer && (
                      <span className="text-xs text-muted-foreground">
                        {take.audioBuffer.duration.toFixed(1)}s
                      </span>
                    )}
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      onClick={() => removeTake(track.id, take.id)}
                      data-ocid={`effects.delete_button.${i + 1}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
