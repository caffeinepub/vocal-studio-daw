import { create } from "zustand";
import { audioEngine } from "../audio/AudioEngine";
import type { AudioClip, Take, Track, TrackEffects } from "../types";
import { DEFAULT_EFFECTS, TRACK_COLORS } from "../types";

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

interface DAWState {
  tracks: Track[];
  isPlaying: boolean;
  isLooping: boolean;
  currentTime: number;
  totalDuration: number;
  bpm: number;
  timeSignature: [number, number];
  zoom: number;
  scrollX: number;
  masterVolume: number;
  masterEQ: { low: number; mid: number; high: number };
  activePanel: "timeline" | "mixer";
  selectedTrackId: string | null;
  effectsTrackId: string | null;

  // actions
  addTrack: (name: string, color?: string) => string;
  removeTrack: (id: string) => void;
  renameTrack: (id: string, name: string) => void;
  reorderTrack: (id: string, direction: "up" | "down") => void;
  setTrackVolume: (id: string, volume: number) => void;
  setTrackPan: (id: string, pan: number) => void;
  toggleMute: (id: string) => void;
  toggleSolo: (id: string) => void;
  addClip: (trackId: string, clip: Omit<AudioClip, "id">) => void;
  updateClip: (
    trackId: string,
    clipId: string,
    updates: Partial<AudioClip>,
  ) => void;
  removeClip: (trackId: string, clipId: string) => void;
  addTake: (trackId: string, take: Omit<Take, "id">) => void;
  updateTake: (trackId: string, takeId: string, updates: Partial<Take>) => void;
  removeTake: (trackId: string, takeId: string) => void;
  flattenTakes: (trackId: string) => void;
  updateEffects: (trackId: string, effects: Partial<TrackEffects>) => void;
  setPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  toggleLoop: () => void;
  setBPM: (bpm: number) => void;
  setZoom: (zoom: number) => void;
  setScrollX: (x: number) => void;
  setMasterVolume: (vol: number) => void;
  setMasterEQ: (band: "low" | "mid" | "high", val: number) => void;
  setActivePanel: (panel: "timeline" | "mixer") => void;
  selectTrack: (id: string | null) => void;
  setEffectsTrackId: (id: string | null) => void;
  recalcDuration: () => void;
}

const DEFAULT_TRACKS: Track[] = [
  {
    id: "track-1",
    name: "Lead Vocals",
    color: TRACK_COLORS[0],
    volume: 0.8,
    pan: 0,
    muted: false,
    soloed: false,
    clips: [],
    takes: [],
    effects: { ...DEFAULT_EFFECTS },
  },
  {
    id: "track-2",
    name: "Instrumental",
    color: TRACK_COLORS[1],
    volume: 0.7,
    pan: 0,
    muted: false,
    soloed: false,
    clips: [],
    takes: [],
    effects: { ...DEFAULT_EFFECTS },
  },
  {
    id: "track-3",
    name: "Background Vocals",
    color: TRACK_COLORS[2],
    volume: 0.6,
    pan: 0,
    muted: false,
    soloed: false,
    clips: [],
    takes: [],
    effects: { ...DEFAULT_EFFECTS },
  },
];

export const useDAWStore = create<DAWState>((set, get) => ({
  tracks: DEFAULT_TRACKS,
  isPlaying: false,
  isLooping: false,
  currentTime: 0,
  totalDuration: 60,
  bpm: 120,
  timeSignature: [4, 4],
  zoom: 80,
  scrollX: 0,
  masterVolume: 0.8,
  masterEQ: { low: 0, mid: 0, high: 0 },
  activePanel: "timeline",
  selectedTrackId: null,
  effectsTrackId: null,

  addTrack: (name, color) => {
    const id = generateId();
    const tracks = get().tracks;
    const trackColor =
      color ?? TRACK_COLORS[tracks.length % TRACK_COLORS.length];
    const newTrack: Track = {
      id,
      name,
      color: trackColor,
      volume: 0.8,
      pan: 0,
      muted: false,
      soloed: false,
      clips: [],
      takes: [],
      effects: {
        reverb: { enabled: false, roomSize: 0.4, decay: 0.5, wet: 0.3 },
        noiseGate: { enabled: false, threshold: -40, ratio: 4 },
        pitchCorrection: {
          enabled: false,
          key: "C",
          scale: "Major",
          strength: 0.5,
        },
      },
    };
    set((s) => ({ tracks: [...s.tracks, newTrack] }));
    return id;
  },

  removeTrack: (id) => {
    audioEngine.removeTrackNodes(id);
    set((s) => ({
      tracks: s.tracks.filter((t) => t.id !== id),
      selectedTrackId: s.selectedTrackId === id ? null : s.selectedTrackId,
      effectsTrackId: s.effectsTrackId === id ? null : s.effectsTrackId,
    }));
  },

  renameTrack: (id, name) =>
    set((s) => ({
      tracks: s.tracks.map((t) => (t.id === id ? { ...t, name } : t)),
    })),

  reorderTrack: (id, direction) =>
    set((s) => {
      const idx = s.tracks.findIndex((t) => t.id === id);
      if (idx === -1) return s;
      const newTracks = [...s.tracks];
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= newTracks.length) return s;
      [newTracks[idx], newTracks[targetIdx]] = [
        newTracks[targetIdx],
        newTracks[idx],
      ];
      return { tracks: newTracks };
    }),

  setTrackVolume: (id, volume) => {
    audioEngine.setTrackVolume(id, volume);
    set((s) => ({
      tracks: s.tracks.map((t) => (t.id === id ? { ...t, volume } : t)),
    }));
  },

  setTrackPan: (id, pan) => {
    audioEngine.setTrackPan(id, pan);
    set((s) => ({
      tracks: s.tracks.map((t) => (t.id === id ? { ...t, pan } : t)),
    }));
  },

  toggleMute: (id) =>
    set((s) => ({
      tracks: s.tracks.map((t) =>
        t.id === id ? { ...t, muted: !t.muted } : t,
      ),
    })),

  toggleSolo: (id) =>
    set((s) => ({
      tracks: s.tracks.map((t) =>
        t.id === id ? { ...t, soloed: !t.soloed } : t,
      ),
    })),

  addClip: (trackId, clip) => {
    const newClip: AudioClip = { ...clip, id: generateId() };
    set((s) => ({
      tracks: s.tracks.map((t) =>
        t.id === trackId ? { ...t, clips: [...t.clips, newClip] } : t,
      ),
    }));
    get().recalcDuration();
  },

  updateClip: (trackId, clipId, updates) =>
    set((s) => ({
      tracks: s.tracks.map((t) =>
        t.id === trackId
          ? {
              ...t,
              clips: t.clips.map((c) =>
                c.id === clipId ? { ...c, ...updates } : c,
              ),
            }
          : t,
      ),
    })),

  removeClip: (trackId, clipId) =>
    set((s) => ({
      tracks: s.tracks.map((t) =>
        t.id === trackId
          ? { ...t, clips: t.clips.filter((c) => c.id !== clipId) }
          : t,
      ),
    })),

  addTake: (trackId, take) => {
    const newTake: Take = { ...take, id: generateId() };
    set((s) => ({
      tracks: s.tracks.map((t) =>
        t.id === trackId ? { ...t, takes: [...t.takes, newTake] } : t,
      ),
    }));
  },

  updateTake: (trackId, takeId, updates) =>
    set((s) => ({
      tracks: s.tracks.map((t) =>
        t.id === trackId
          ? {
              ...t,
              takes: t.takes.map((tk) =>
                tk.id === takeId ? { ...tk, ...updates } : tk,
              ),
            }
          : t,
      ),
    })),

  removeTake: (trackId, takeId) =>
    set((s) => ({
      tracks: s.tracks.map((t) =>
        t.id === trackId
          ? { ...t, takes: t.takes.filter((tk) => tk.id !== takeId) }
          : t,
      ),
    })),

  flattenTakes: (trackId) => {
    const state = get();
    const track = state.tracks.find((t) => t.id === trackId);
    if (!track) return;
    const selectedTake = track.takes.find((tk) => tk.selected);
    if (!selectedTake?.audioBuffer) return;
    const clip: Omit<AudioClip, "id"> = {
      name: selectedTake.name,
      audioBuffer: selectedTake.audioBuffer,
      startTime: 0,
      duration: selectedTake.audioBuffer.duration,
      color: track.color,
    };
    state.addClip(trackId, clip);
  },

  updateEffects: (trackId, effects) =>
    set((s) => ({
      tracks: s.tracks.map((t) =>
        t.id === trackId ? { ...t, effects: { ...t.effects, ...effects } } : t,
      ),
    })),

  setPlaying: (playing) => set({ isPlaying: playing }),

  setCurrentTime: (time) => set({ currentTime: time }),

  toggleLoop: () => set((s) => ({ isLooping: !s.isLooping })),

  setBPM: (bpm) => set({ bpm }),

  setZoom: (zoom) => set({ zoom: Math.max(20, Math.min(400, zoom)) }),

  setScrollX: (scrollX) => set({ scrollX }),

  setMasterVolume: (vol) => {
    audioEngine.setMasterVolume(vol);
    set({ masterVolume: vol });
  },

  setMasterEQ: (band, val) => {
    audioEngine.setEQBand(band, val);
    set((s) => ({ masterEQ: { ...s.masterEQ, [band]: val } }));
  },

  setActivePanel: (panel) => set({ activePanel: panel }),

  selectTrack: (id) => set({ selectedTrackId: id }),

  setEffectsTrackId: (id) => set({ effectsTrackId: id }),

  recalcDuration: () => {
    const tracks = get().tracks;
    let maxEnd = 60;
    for (const track of tracks) {
      for (const clip of track.clips) {
        const end = clip.startTime + clip.duration;
        if (end > maxEnd) maxEnd = end;
      }
    }
    set({ totalDuration: maxEnd + 10 });
  },
}));
