import type { AudioClip, Track } from "../types";

interface TrackNodes {
  gain: GainNode;
  pan: StereoPannerNode;
  analyser: AnalyserNode;
  convolver: ConvolverNode | null;
  reverbGain: GainNode;
  dryGain: GainNode;
}

export class AudioEngine {
  private _ctx: AudioContext | null = null;
  masterGain!: GainNode;
  masterEQLow!: BiquadFilterNode;
  masterEQMid!: BiquadFilterNode;
  masterEQHigh!: BiquadFilterNode;
  analyser!: AnalyserNode;

  private trackNodes = new Map<string, TrackNodes>();
  private activeSources: AudioBufferSourceNode[] = [];
  private _isPlaying = false;
  private startAudioTime = 0;
  private _startOffset = 0;

  get ctx(): AudioContext {
    if (!this._ctx) {
      this._ctx = new AudioContext();
      this.setupMasterChain();
    }
    return this._ctx;
  }

  get isPlaying() {
    return this._isPlaying;
  }

  private setupMasterChain() {
    const ctx = this._ctx!;
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0.8;

    this.masterEQLow = ctx.createBiquadFilter();
    this.masterEQLow.type = "lowshelf";
    this.masterEQLow.frequency.value = 200;

    this.masterEQMid = ctx.createBiquadFilter();
    this.masterEQMid.type = "peaking";
    this.masterEQMid.frequency.value = 1000;
    this.masterEQMid.Q.value = 1;

    this.masterEQHigh = ctx.createBiquadFilter();
    this.masterEQHigh.type = "highshelf";
    this.masterEQHigh.frequency.value = 5000;

    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;

    this.masterGain
      .connect(this.masterEQLow)
      .connect(this.masterEQMid)
      .connect(this.masterEQHigh)
      .connect(this.analyser)
      .connect(ctx.destination);
  }

  async resume() {
    if (this._ctx?.state === "suspended") {
      await this._ctx.resume();
    }
  }

  async loadAudioFile(file: File): Promise<AudioBuffer> {
    const ctx = this.ctx;
    await this.resume();
    const arrayBuffer = await file.arrayBuffer();
    return ctx.decodeAudioData(arrayBuffer);
  }

  createReverbIR(roomSize: number, decay: number): AudioBuffer {
    const ctx = this.ctx;
    const length = Math.floor(ctx.sampleRate * (0.5 + roomSize * 4.5));
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const data = impulse.getChannelData(c);
      for (let i = 0; i < length; i++) {
        data[i] =
          (Math.random() * 2 - 1) * (1 - i / length) ** (decay * 10 + 0.5);
      }
    }
    return impulse;
  }

  initTrackNodes(trackId: string, volume: number, pan: number) {
    if (this.trackNodes.has(trackId)) return;
    const ctx = this.ctx;

    const gain = ctx.createGain();
    gain.gain.value = volume;

    const panNode = ctx.createStereoPanner();
    panNode.pan.value = pan;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;

    const dryGain = ctx.createGain();
    dryGain.gain.value = 1;

    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0;

    gain.connect(panNode);
    panNode.connect(dryGain);
    dryGain.connect(this.masterGain);
    reverbGain.connect(this.masterGain);
    panNode.connect(analyser);

    this.trackNodes.set(trackId, {
      gain,
      pan: panNode,
      analyser,
      convolver: null,
      reverbGain,
      dryGain,
    });
  }

  removeTrackNodes(trackId: string) {
    const nodes = this.trackNodes.get(trackId);
    if (nodes) {
      try {
        nodes.gain.disconnect();
        nodes.pan.disconnect();
        nodes.dryGain.disconnect();
        nodes.reverbGain.disconnect();
        nodes.analyser.disconnect();
        if (nodes.convolver) nodes.convolver.disconnect();
      } catch {
        // ignore
      }
      this.trackNodes.delete(trackId);
    }
  }

  setTrackVolume(trackId: string, volume: number) {
    const nodes = this.trackNodes.get(trackId);
    if (nodes) nodes.gain.gain.value = volume;
  }

  setTrackPan(trackId: string, pan: number) {
    const nodes = this.trackNodes.get(trackId);
    if (nodes) nodes.pan.pan.value = pan;
  }

  setMasterVolume(volume: number) {
    if (this._ctx) this.masterGain.gain.value = volume;
  }

  setEQBand(band: "low" | "mid" | "high", gain: number) {
    if (!this._ctx) return;
    if (band === "low") this.masterEQLow.gain.value = gain;
    else if (band === "mid") this.masterEQMid.gain.value = gain;
    else this.masterEQHigh.gain.value = gain;
  }

  updateReverb(
    trackId: string,
    roomSize: number,
    decay: number,
    wet: number,
    enabled: boolean,
  ) {
    const nodes = this.trackNodes.get(trackId);
    if (!nodes) return;

    if (enabled) {
      if (nodes.convolver) {
        try {
          nodes.convolver.disconnect();
        } catch {
          // ignore
        }
      }
      const ir = this.createReverbIR(roomSize, decay);
      const convolver = this.ctx.createConvolver();
      convolver.buffer = ir;
      nodes.pan.connect(convolver);
      convolver.connect(nodes.reverbGain);
      nodes.convolver = convolver;
      nodes.reverbGain.gain.value = wet;
      nodes.dryGain.gain.value = 1 - wet * 0.5;
    } else {
      nodes.reverbGain.gain.value = 0;
      nodes.dryGain.gain.value = 1;
    }
  }

  getCurrentTime(): number {
    if (!this._isPlaying || !this._ctx) return this._startOffset;
    return this._ctx.currentTime - this.startAudioTime + this._startOffset;
  }

  startPlayback(tracks: Track[], startTime: number) {
    if (!this._ctx) return;
    this.stopPlayback();
    this._startOffset = startTime;
    this.startAudioTime = this._ctx.currentTime;
    this._isPlaying = true;

    const hasSolo = tracks.some((t) => t.soloed);

    for (const track of tracks) {
      if (track.muted) continue;
      if (hasSolo && !track.soloed) continue;

      const nodes = this.trackNodes.get(track.id);
      if (!nodes) continue;

      for (const clip of track.clips) {
        this.startClip(clip, nodes, startTime);
      }
    }
  }

  private startClip(clip: AudioClip, nodes: TrackNodes, startTime: number) {
    if (!clip.audioBuffer || !this._ctx) return;
    const clipEnd = clip.startTime + clip.duration;
    if (clipEnd <= startTime) return;

    const source = this._ctx.createBufferSource();
    source.buffer = clip.audioBuffer;
    source.connect(nodes.gain);

    let when: number;
    let offset: number;

    if (clip.startTime >= startTime) {
      when = this._ctx.currentTime + (clip.startTime - startTime);
      offset = 0;
    } else {
      when = this._ctx.currentTime;
      offset = startTime - clip.startTime;
    }

    source.start(when, offset);
    this.activeSources.push(source);
  }

  stopPlayback() {
    const wasPlaying = this._isPlaying;
    if (wasPlaying) {
      this._startOffset = this.getCurrentTime();
    }
    this._isPlaying = false;
    for (const source of this.activeSources) {
      try {
        source.stop();
      } catch {
        // ignore
      }
    }
    this.activeSources = [];
  }

  seekTo(time: number) {
    const wasPlaying = this._isPlaying;
    if (wasPlaying && this._ctx) {
      this.stopPlayback();
      this._startOffset = time;
    } else {
      this._startOffset = time;
    }
    return wasPlaying;
  }

  getAnalyserData(): Uint8Array {
    if (!this._ctx || !this.analyser) return new Uint8Array(0);
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  getTrackAnalyserData(trackId: string): Uint8Array {
    const nodes = this.trackNodes.get(trackId);
    if (!nodes) return new Uint8Array(0);
    const data = new Uint8Array(nodes.analyser.frequencyBinCount);
    nodes.analyser.getByteTimeDomainData(data);
    return data;
  }

  async renderOffline(tracks: Track[], duration: number): Promise<AudioBuffer> {
    const sampleRate = 44100;
    const numSamples = Math.ceil(duration * sampleRate);
    if (numSamples <= 0) throw new Error("No audio to render");

    const offlineCtx = new OfflineAudioContext(2, numSamples, sampleRate);
    const masterGain = offlineCtx.createGain();
    masterGain.gain.value = 0.8;
    masterGain.connect(offlineCtx.destination);

    const hasSolo = tracks.some((t) => t.soloed);

    for (const track of tracks) {
      if (track.muted) continue;
      if (hasSolo && !track.soloed) continue;

      const trackGain = offlineCtx.createGain();
      trackGain.gain.value = track.volume;
      const panNode = offlineCtx.createStereoPanner();
      panNode.pan.value = track.pan;
      trackGain.connect(panNode);
      panNode.connect(masterGain);

      for (const clip of track.clips) {
        if (!clip.audioBuffer) continue;
        const source = offlineCtx.createBufferSource();
        source.buffer = clip.audioBuffer;
        source.connect(trackGain);
        source.start(clip.startTime);
      }
    }

    return offlineCtx.startRendering();
  }

  audioBufferToWAV(buffer: AudioBuffer): Blob {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const numSamples = buffer.length;
    const bytesPerSample = 2;
    const dataSize = numChannels * numSamples * bytesPerSample;
    const arrayBuffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(arrayBuffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++)
        view.setUint8(offset + i, str.charCodeAt(i));
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
    view.setUint16(32, numChannels * bytesPerSample, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, dataSize, true);

    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      for (let c = 0; c < numChannels; c++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(c)[i]));
        view.setInt16(
          offset,
          sample < 0 ? sample * 0x8000 : sample * 0x7fff,
          true,
        );
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: "audio/wav" });
  }
}

export const audioEngine = new AudioEngine();
