# Vocal Studio DAW

## Current State
Each TrackRow has controls: volume slider, Mute (M), Solo (S), Effects (Fx), reorder arrows, and delete. Users can upload audio via a hidden file input triggered by clicking the waveform area. No recording capability exists.

## Requested Changes (Diff)

### Add
- Record button (mic icon) on each TrackRow
- When clicked, requests microphone permission and starts recording via MediaRecorder API
- While recording, button pulses red and shows a stop icon
- On stop, the recorded audio is decoded into an AudioBuffer and added as a new clip on that track (same flow as file upload via `addClip`)
- If mic permission is denied, show a toast error
- Recording state is local to each TrackRow (no store changes needed)

### Modify
- TrackRow.tsx: add mic/record button next to the Fx button

### Remove
- Nothing removed

## Implementation Plan
1. In TrackRow.tsx import `Mic`, `Square` from lucide-react
2. Add local state: `isRecording`, `mediaRecorder`, `recordedChunks`
3. `startRecording`: request `getUserMedia({ audio: true })`, create MediaRecorder, collect chunks on `ondataavailable`, call `stopRecording` cleanup on `onstop`
4. `stopRecording`: stop the MediaRecorder and stream tracks
5. On `onstop`: create Blob from chunks, decode via `audioEngine`'s AudioContext (or `new AudioContext().decodeAudioData`), then call `addClip` with the resulting AudioBuffer
6. Add record button in the controls row between Fx and reorder buttons; style with pulsing red ring when recording
7. Show toast on permission denial
