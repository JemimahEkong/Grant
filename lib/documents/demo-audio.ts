export function buildDemoWav(input: { seconds?: number; frequency?: number; sampleRate?: number } = {}): Buffer {
  const seconds = input.seconds ?? 2;
  const frequency = input.frequency ?? 440;
  const sampleRate = input.sampleRate ?? 44100;
  const channels = 1;
  const bitsPerSample = 16;
  const sampleCount = Math.floor(seconds * sampleRate);
  const dataLength = sampleCount * channels * (bitsPerSample / 8);
  const buffer = Buffer.alloc(44 + dataLength);

  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write("WAVE", 8, "ascii");
  buffer.write("fmt ", 12, "ascii");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * (bitsPerSample / 8), 28);
  buffer.writeUInt16LE(channels * (bitsPerSample / 8), 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(dataLength, 40);

  const fadeSamples = Math.min(Math.floor(sampleRate * 0.05), Math.floor(sampleCount / 2));
  for (let index = 0; index < sampleCount; index += 1) {
    const t = index / sampleRate;
    const fadeIn = index < fadeSamples ? index / fadeSamples : 1;
    const fadeOut = index > sampleCount - fadeSamples ? (sampleCount - index) / fadeSamples : 1;
    const envelope = Math.min(fadeIn, fadeOut);
    const sample = Math.sin(2 * Math.PI * frequency * t) * 0.18 * envelope;
    buffer.writeInt16LE(Math.round(sample * 32767), 44 + index * 2);
  }
  return buffer;
}
