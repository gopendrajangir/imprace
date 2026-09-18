import { useCallback, useEffect, useRef, useState } from 'react';
import { NitroFilesAPI, NitroKittenTTSML } from 'react-native-akki-ai';

import { TTS_SAMPLE_RATE } from '@/constants';

interface UseKittenTTSOptions {
  sentences: string[];
  resetTrigger: number;
}

export interface KittenResult {
  path: string | null;
  sentence: string;
  index: number;
  success?: boolean;
  phonemes?: string[];
  durationFrames?: number[];
}

export const useKittenTTS = ({
  sentences,
  resetTrigger,
}: UseKittenTTSOptions) => {
  const [kittenResult, setKittenResult] = useState<KittenResult[]>([]);
  const [inferenceTime, setInferenceTime] = useState(0);

  const startTimeRef = useRef(0);

  const indexRef = useRef(0);
  const isSynthesizingRef = useRef(false);
  const sentencesRef = useRef(sentences);

  sentencesRef.current = sentences;

  const processNext = useCallback(async () => {
    const sentences = sentencesRef.current;

    if (isSynthesizingRef.current) return;
    if (indexRef.current >= sentences.length) return;

    isSynthesizingRef.current = true;

    const index = indexRef.current;
    const sentence = sentences[index];

    try {
      if (sentences.length === 1) {
        startTimeRef.current = Date.now();
      }

      const synthesisResult = await NitroKittenTTSML.synthesize(sentence);
      const { pcm, phonemes, durationFrames } = synthesisResult;

      const wavPath = NitroFilesAPI.floatBufferToWav(pcm, TTS_SAMPLE_RATE);

      if (sentences.length === 1) {
        setInferenceTime((Date.now() - startTimeRef.current) / 1000);
      }

      setKittenResult(w => [
        ...w,
        {
          path: wavPath,
          sentence,
          index,
          success: true,
          phonemes,
          durationFrames,
        },
      ]);
    } catch (err) {
      setKittenResult(w => [
        ...w,
        {
          path: null,
          sentence,
          index,
          success: false,
        },
      ]);
    } finally {
      indexRef.current = index + 1;
      isSynthesizingRef.current = false;
      processNext();
    }
  }, []);

  useEffect(() => {
    processNext();
  }, [sentences, processNext]);

  useEffect(() => {
    setKittenResult([]);
    indexRef.current = 0;
    isSynthesizingRef.current = false;
  }, [resetTrigger]);

  return {
    kittenResult,
    kittenInferenceTime: inferenceTime,
  };
};
