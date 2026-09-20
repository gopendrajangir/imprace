import { Platform } from 'react-native';

export const WHISPER_MODEL_GGML = 'ggml-tiny.en-q5_1.bin';
export const WHISPER_MODEL_LITERT = 'whisper_tiny_30s_f32.tflite';
export const LLM_MODEL = 'gemma-4-E2B-it.litertlm';
export const TTS_MODEL = 'kitten_tts_nano_v0_8.onnx';
export const VAD_MODEL = 'ggml-silero-v5.1.2.bin';
export const TTS_SAMPLE_RATE = 24000;
export const RECORDING_SAMPLE_RATE = 16000;
export const MODEL_IDS = Platform.select({
  android: ['llm', 'tts', 'asr-ggml', 'asr-litert', 'vad'],
  ios: ['llm', 'tts', 'asr', 'vad'],
  default: ['llm', 'tts', 'asr', 'vad'],
});
