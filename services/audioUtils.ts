
// -- GLOBAL AUDIO ARCHITECTURE v4.5 --
// Manages UI and speech audio with a robust procedural fallback system.
// If remote assets fail to load, synthesized audio is generated on-the-fly.

let globalAudioContext: AudioContext | null = null;
const activeSources = new Set<AudioScheduledSourceNode>();
let currentSpeechSource: AudioBufferSourceNode | null = null;

// --- SOUND LIBRARY ---
const SOUNDS = {
  hover: 'https://storage.googleapis.com/aistudio-fluff-assets/codelab-rockhound-gcn/audio/ui_hover.mp3',
  click: 'https://storage.googleapis.com/aistudio-fluff-assets/codelab-rockhound-gcn/audio/ui_click.mp3',
  success: 'https://storage.googleapis.com/aistudio-fluff-assets/codelab-rockhound-gcn/audio/ui_success.mp3',
  error: 'https://storage.googleapis.com/aistudio-fluff-assets/codelab-rockhound-gcn/audio/ui_error.mp3',
  revealImpact: 'https://storage.googleapis.com/aistudio-fluff-assets/codelab-rockhound-gcn/audio/reveal_impact.mp3',
  revealChime: 'https://storage.googleapis.com/aistudio-fluff-assets/codelab-rockhound-gcn/audio/reveal_chime.mp3',
  boot: 'https://storage.googleapis.com/aistudio-fluff-assets/codelab-rockhound-gcn/audio/boot_sequence.mp3',
  warp: 'https://storage.googleapis.com/aistudio-fluff-assets/codelab-rockhound-gcn/audio/warp.mp3',
  type: 'https://storage.googleapis.com/aistudio-fluff-assets/codelab-rockhound-gcn/audio/type_keystroke.mp3',
  ambience: 'https://storage.googleapis.com/aistudio-fluff-assets/codelab-rockhound-gcn/audio/ambience_loop.mp3',
} as const;

type SoundId = keyof typeof SOUNDS;

const audioBuffers = new Map<SoundId, AudioBuffer>();
const loopingSources = new Map<SoundId, { source: AudioBufferSourceNode, gain: GainNode }>();
let isInitialized = false;

// --- CORE FUNCTIONS ---

export function getGlobalAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!globalAudioContext) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        globalAudioContext = new AudioContextClass({ sampleRate: 44100 });
      }
  }
  if (globalAudioContext && globalAudioContext.state === 'suspended') {
      globalAudioContext.resume().catch(() => {});
  }
  return globalAudioContext;
}

/**
 * Initializes the audio system.
 * Attempts to preload MP3s, but falls back to procedural synthesis if fetch fails.
 */
export const initAudio = async () => {
    if (isInitialized) return;
    const ctx = getGlobalAudioContext();
    if (!ctx) return;
    
    console.log('[AUDIO CORE] Initializing hybrid sound engine...');
    
    const promises = Object.entries(SOUNDS).map(async ([id, path]) => {
        try {
            const response = await fetch(path);
            if (!response.ok) throw new Error("Asset unavailable");
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
            audioBuffers.set(id as SoundId, audioBuffer);
        } catch (e) {
            console.warn(`[AUDIO CORE] Remote asset '${id}' failed. Synthesizing procedural fallback.`);
            // Generate a synthetic fallback so the app isn't silent
            const fallback = generateProceduralBuffer(id as SoundId, ctx);
            audioBuffers.set(id as SoundId, fallback);
        }
    });
    
    await Promise.all(promises);
    isInitialized = true;
    console.log('[AUDIO CORE] Sound system stabilized with procedural fallbacks.');
};

/**
 * Procedural Audio Synthesis Logic
 * Creates sci-fi themed buffers mathematically.
 */
function generateProceduralBuffer(id: SoundId, ctx: AudioContext): AudioBuffer {
  const duration = id === 'ambience' ? 2 : id === 'boot' ? 1.5 : 0.2;
  const sampleRate = ctx.sampleRate;
  const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate;
    switch(id) {
      case 'click':
        data[i] = Math.sin(2 * Math.PI * 800 * t) * Math.exp(-20 * t);
        break;
      case 'hover':
        data[i] = Math.sin(2 * Math.PI * (1200 - t * 400) * t) * Math.exp(-50 * t);
        break;
      case 'type':
        data[i] = (Math.random() * 2 - 1) * Math.exp(-100 * t);
        break;
      case 'success':
        data[i] = Math.sin(2 * Math.PI * (440 + Math.floor(t * 4) * 110) * t) * Math.exp(-3 * t);
        break;
      case 'error':
        data[i] = (Math.sin(2 * Math.PI * 100 * t) + Math.random() * 0.1) * Math.exp(-5 * t);
        break;
      case 'ambience':
        data[i] = (Math.random() * 2 - 1) * 0.02 * (Math.sin(t * 0.5) * 0.5 + 0.5);
        break;
      default:
        data[i] = Math.sin(2 * Math.PI * 440 * t) * Math.exp(-5 * t);
    }
  }
  return buffer;
}

export const playSound = (id: SoundId, options: { loop?: boolean, volume?: number, playbackRate?: number } = {}) => {
    const ctx = getGlobalAudioContext();
    if (!ctx || !isInitialized) return;

    const buffer = audioBuffers.get(id);
    if (!buffer) return;

    if (options.loop) {
        if (loopingSources.has(id)) return;
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        const gainNode = ctx.createGain();
        gainNode.gain.value = options.volume ?? 0.3;
        source.connect(gainNode).connect(ctx.destination);
        source.start();
        loopingSources.set(id, { source, gain: gainNode });
        registerSource(source);
    } else {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = options.playbackRate ?? 1.0;
        const gainNode = ctx.createGain();
        gainNode.gain.value = options.volume ?? 1.0;
        source.connect(gainNode).connect(ctx.destination);
        source.start();
        registerSource(source);
    }
};

export const setLoopingSoundVolume = (id: SoundId, volume: number) => {
    const ctx = getGlobalAudioContext();
    if (!ctx || !loopingSources.has(id)) return;
    const sound = loopingSources.get(id);
    if (sound) sound.gain.gain.setTargetAtTime(volume, ctx.currentTime, 0.1);
};

export const stopSound = (id: SoundId) => {
    if (loopingSources.has(id)) {
        const sound = loopingSources.get(id);
        try { sound?.source.stop(); } catch(e) {}
        loopingSources.delete(id);
    }
};

export function registerSource(source: AudioScheduledSourceNode) {
  activeSources.add(source);
  source.addEventListener('ended', () => activeSources.delete(source));
  return source;
}

export function stopAllSources() {
  activeSources.forEach(source => {
    try { source.stop(); source.disconnect(); } catch (e) {}
  });
  activeSources.clear();
  currentSpeechSource = null;
  loopingSources.clear();
}

export function setSpeechSource(source: AudioBufferSourceNode | null) {
  if (currentSpeechSource) {
    try { currentSpeechSource.stop(); currentSpeechSource.disconnect(); } catch (e) {}
    activeSources.delete(currentSpeechSource);
  }
  if (source) {
    currentSpeechSource = source;
    registerSource(source);
  } else {
    currentSpeechSource = null;
  }
}

export function decode(base64: string): Uint8Array {
  try {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    return new Uint8Array(0);
  }
}

export function encode(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  let buffer = data.buffer;
  if (data.byteLength % 2 !== 0) {
    const newBuffer = new ArrayBuffer(data.byteLength + 1);
    new Uint8Array(newBuffer).set(data);
    buffer = newBuffer;
  }

  const dataInt16 = new Int16Array(buffer);
  const frameCount = dataInt16.length / numChannels;
  const outputChannels = numChannels === 1 ? 2 : numChannels;
  const audioBuffer = ctx.createBuffer(outputChannels, frameCount, sampleRate);

  let maxAmplitude = 0;
  const floatData = new Float32Array(frameCount);

  for (let i = 0; i < frameCount; i++) {
    let sample = 0;
    for (let c = 0; c < numChannels; c++) sample += dataInt16[i * numChannels + c];
    sample /= numChannels;
    const floatSample = sample / 32768.0;
    floatData[i] = floatSample;
    if (Math.abs(floatSample) > maxAmplitude) maxAmplitude = Math.abs(floatSample);
  }

  const normalizationFactor = maxAmplitude > 0.01 ? (0.95 / maxAmplitude) : 1.0;

  for (let channel = 0; channel < outputChannels; channel++) {
    const channelData = audioBuffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      let sample = floatData[i] * normalizationFactor;
      if (numChannels === 1 && outputChannels === 2 && channel === 1) {
         sample = (sample + floatData[Math.max(0, i - 1)] * normalizationFactor) * 0.5;
      }
      channelData[i] = sample;
    }
  }

  return audioBuffer;
}
