let mediaRecorder = null;

export function startRecorder(stream, chunks) {
  mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
  mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
  mediaRecorder.start();
  return mediaRecorder;
}

export function stopRecorder() {
  return new Promise((res) => {
    if (!mediaRecorder) return res();
    mediaRecorder.onstop = () => res();
    mediaRecorder.stop();
  });
}

export async function decodeAudio(arrayBuffer) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  return await ctx.decodeAudioData(arrayBuffer);
}

export function toMono(audioBuffer) {
  if (audioBuffer.numberOfChannels === 1) return audioBuffer.getChannelData(0);
  const ch0 = audioBuffer.getChannelData(0);
  const ch1 = audioBuffer.getChannelData(1);
  const out = new Float32Array(audioBuffer.length);
  for (let i = 0; i < out.length; i++) out[i] = (ch0[i] + ch1[i]) / 2;
  return out;
}

export function resampleFloat32(float32, originalRate, targetRate) {
  if (originalRate === targetRate) return float32;
  const ratio = originalRate / targetRate;
  const newLen = Math.round(float32.length / ratio);
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
