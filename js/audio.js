// Worklet-based PCM capture (cross-browser) + resample to 16k mono.
let ctx = null;
let source = null;
let node = null;
let pcmChunks = [];
let mediaStream = null;

export async function startPCM(stream) {
  mediaStream = stream;
  ctx = new (window.AudioContext || window.webkitAudioContext)();

  if (!ctx.audioWorklet) {
    throw new Error('AudioWorklet not supported');
  }
  try {
    // Robust relative path resolution
    await ctx.audioWorklet.addModule(new URL('./recorder-worklet.js', import.meta.url));
  } catch (e) {
    console.error('AudioWorklet addModule failed:', e);
    throw e;
  }

  source = ctx.createMediaStreamSource(stream);
  node = new AudioWorkletNode(ctx, 'recorder');

  pcmChunks = [];
  node.port.onmessage = (e) => {
    if (e.data?.type === 'data' && e.data.buffer) pcmChunks.push(e.data.buffer);
  };

  const sink = ctx.createGain(); sink.gain.value = 0;
  source.connect(node); node.connect(sink).connect(ctx.destination);
}

export async function stopPCM() {
  try { if (mediaStream) mediaStream.getTracks().forEach(t => t.stop()); } catch {}
  try {
    if (source) source.disconnect();
    if (node) node.disconnect();
    if (ctx && ctx.state !== 'closed') await ctx.close();
  } catch {}

  const recorded = concatFloat32(pcmChunks);
  const inRate = (ctx && ctx.sampleRate) || 48000;
  const pcm16k = resampleFloat32(recorded, inRate, 16000);

  ctx = source = node = null; pcmChunks = []; mediaStream = null;
  return pcm16k;
}

function concatFloat32(chunks) {
  if (!chunks || !chunks.length) return new Float32Array(0);
  let total = 0; for (const c of chunks) total += c.length;
  const out = new Float32Array(total);
  let offset = 0;
  for (const c of chunks) { out.set(c, offset); offset += c.length; }
  return out;
}

export function resampleFloat32(float32, originalRate, targetRate) {
  if (!float32 || float32.length === 0) return new Float32Array(0);
  if (originalRate === targetRate) return float32;
  const ratio = originalRate / targetRate;
  const newLen = Math.max(1, Math.round(float32.length / ratio));
  const out = new Float32Array(newLen);
  for (let i = 0; i < newLen; i++) {
    const idx = i * ratio;
    const i0 = Math.floor(idx);
    const i1 = Math.min(i0 + 1, float32.length - 1);
    const frac = idx - i0;
    out[i] = float32[i0] * (1 - frac) + float32[i1] * frac;
  }
  return out;
}
