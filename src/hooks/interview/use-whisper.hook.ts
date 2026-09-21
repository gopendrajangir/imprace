import { useCallback, useEffect, useRef, useState } from 'react';
import { NitroWhisperLiteRT, NitroWhisperML } from 'react-native-akki-ai';

import { Platform } from 'react-native';

type TranscribeStatus = 'idle' | 'transcribing' | 'finished' | 'failed';

interface UseWhisperOptions {
  isRecording: boolean;
}

export const useWhisper = ({ isRecording }: UseWhisperOptions) => {
  const [transcribeError, setTranscribeError] = useState<string | null>(null);
  const [transcribedText, setTranscribedText] = useState<string | null>(null);
  const [transcribeStatus, setTranscribeStatus] =
    useState<TranscribeStatus>('idle');
  const [inferenceTime, setInferenceTime] = useState(0);

  const startTimeRef = useRef(0);

  const transcribe = useCallback(async (samples: number[]) => {
    setTranscribeStatus('transcribing');
    try {
      startTimeRef.current = Date.now();
      let raw: string | null = '';

      let whisperLiteRTWorked = false;

      if (Platform.OS === 'android') {
        try {
          raw = (await NitroWhisperLiteRT?.transcribe(samples)) ?? null;
          whisperLiteRTWorked = true;
        } catch (err) {
          console.log('Whisper LiteRT', err);
        }
      }

      if (!whisperLiteRTWorked) {
        raw = await NitroWhisperML.transcribe(samples);
      }

      setInferenceTime((Date.now() - startTimeRef.current) / 1000);

      setTranscribeStatus('finished');
      setTranscribedText(raw?.trim() ?? '');
    } catch (err: any) {
      console.log('Error', err);
      setTranscribeError(err?.message ?? 'Error while transcribing your voice');
      setTranscribeStatus('failed');
    }
  }, []);

  useEffect(() => {
    if (isRecording) {
      setTranscribedText(null);
      setTranscribeStatus('idle');
      setTranscribeError(null);
    }
  }, [isRecording]);

  return {
    transcribedText,
    transcribeStatus,
    whisperInferenceTime: inferenceTime,
    transcribeError,
    transcribe,
  };
};
