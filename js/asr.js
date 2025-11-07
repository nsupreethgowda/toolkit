let pipelineInstance = null;

async function getPipeline() {
  if (pipelineInstance) return pipelineInstance;

  const mod = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers/dist/transformers.min.js');
  const { pipeline, env } = mod;

  // ✅ Prefer browser cache, remote models only
  env.useBrowserCache = true;
  env.allowLocalModels = false;
  // (Optional) ensure WASM assets resolve from the CDN:
  // env.backends.onnx.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/@xenova/transformers/dist/';

  // Smallest English model
  pipelineInstance = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', { quantized: true });
  return pipelineInstance;
}

export async function transcribe(float32_16k) {
  const asr = await getPipeline();
  const result = await asr(float32_16k, {
    chunk_length_s: 30,
    stride_length_s: 5,
    return_timestamps: false
  });
  return (result?.text || '').trim();
}
