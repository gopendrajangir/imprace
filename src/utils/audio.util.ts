import { TTS_SAMPLE_RATE } from '@/constants';
import { NitroFilesAPI } from 'react-native-akki-ai';
import Sound from 'react-native-sound';

// base64 PCM16 -> Float32 (mic input decode)
const b64chars =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const b64lookup = new Uint8Array(256);
for (let i = 0; i < b64chars.length; i++) {
  b64lookup[b64chars.charCodeAt(i)] = i;
}
b64lookup[61] = 0;

export const decodeBase64PCM16ToFloat32 = (base64: string): number[] => {
  let padded = base64;
  while (padded.length % 4 > 0) padded += '=';

  let bufferLength = padded.length * 0.75;
  if (padded.endsWith('==')) bufferLength -= 2;
  else if (padded.endsWith('=')) bufferLength -= 1;

  const bytes = new Uint8Array(bufferLength);
  let p = 0;

  for (let i = 0; i < padded.length; i += 4) {
    const enc1 = b64lookup[padded.charCodeAt(i)];
    const enc2 = b64lookup[padded.charCodeAt(i + 1)];
    const enc3 = b64lookup[padded.charCodeAt(i + 2)];
    const enc4 = b64lookup[padded.charCodeAt(i + 3)];

    bytes[p++] = (enc1 << 2) | (enc2 >> 4);
    if (padded.charCodeAt(i + 2) !== 61) {
      bytes[p++] = ((enc2 & 15) << 4) | (enc3 >> 2);
    }
    if (padded.charCodeAt(i + 3) !== 61) {
      bytes[p++] = ((enc3 & 3) << 6) | (enc4 & 63);
    }
  }

  const safeByteLength =
    bytes.byteLength % 2 === 0 ? bytes.byteLength : bytes.byteLength - 1;
  const int16Array = new Int16Array(
    bytes.buffer,
    bytes.byteOffset,
    safeByteLength / 2,
  );
  const float32Array = new Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / 32768.0;
  }
  return float32Array;
};

export const playSilentAudio = async () => {
  const silentSamples = new Float32Array(TTS_SAMPLE_RATE * 0.2); // 200ms of silence
  const silentWav = NitroFilesAPI.floatBufferToWav(
    silentSamples.buffer,
    TTS_SAMPLE_RATE,
  );

  return new Promise<void>(resolve => {
    const s = new Sound(silentWav, '', err => {
      if (err) {
        resolve();
        return;
      }
      s.play(() => {
        s.release();
        resolve();
      });
    });
  });
};
