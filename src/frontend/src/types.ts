export interface AudioClip {
  id: string;
  name: string;
  audioBuffer: AudioBuffer | null;
  startTime: number;
  duration: number;
  color: string;
}

export interface Take {
  id: string;
  name: string;
  audioBuffer: AudioBuffer | null;
  selected: boolean;
}

export interface TrackEffects {
  reverb: { enabled: boolean; roomSize: number; decay: number; wet: number };
  noiseGate: { enabled: boolean; threshold: number; ratio: number };
  pitchCorrection: {
    enabled: boolean;
    key: string;
    scale: string;
    strength: number;
  };
}

export interface Track {
  id: string;
  name: string;
  color: string;
  volume: number;
  pan: number;
  muted: boolean;
  soloed: boolean;
  clips: AudioClip[];
  takes: Take[];
  effects: TrackEffects;
}

export const TRACK_COLORS = [
  "#6B63D6",
  "#E39B3A",
  "#2BBFAE",
  "#E24B4B",
  "#3EE17C",
  "#D7C34A",
];

export const DEFAULT_EFFECTS: TrackEffects = {
  reverb: { enabled: false, roomSize: 0.4, decay: 0.5, wet: 0.3 },
  noiseGate: { enabled: false, threshold: -40, ratio: 4 },
  pitchCorrection: { enabled: false, key: "C", scale: "Major", strength: 0.5 },
};
