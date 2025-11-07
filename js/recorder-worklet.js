// js/recorder-worklet.js
class RecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // no init needed
  }

  process(inputs) {
    // inputs[0][0] is Float32 PCM for the first channel at the AudioContext sampleRate
    const input = inputs[0];
    if (input && input[0]) {
      // Send a copy to main thread (avoid transferring the same buffer ref)
      this.port.postMessage({
        type: 'data',
        buffer: input[0].slice(0) // copy Float32Array
      });
    }
    return true; // keep alive
  }
}

registerProcessor('recorder', RecorderProcessor);
