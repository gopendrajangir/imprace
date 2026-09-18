import {
  LLM_MODEL,
  TTS_MODEL,
  VAD_MODEL,
  WHISPER_MODEL_GGML,
  WHISPER_MODEL_LITERT,
} from '@/constants/global.constant';
import { playSilentAudio } from '@/utils';
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';
import {
  NitroFilesAPI,
  NitroKittenTTSML,
  NitroLocalLLM,
  NitroWhisperLiteRT,
  NitroWhisperML,
} from 'react-native-akki-ai';

export type ModelLoadState = 'idle' | 'loading' | 'failed' | 'loaded';
export type WhisperModel = 'litert' | 'ggml';

interface InterviewSetupContextValue {
  loadModels: () => Promise<void>;
  unloadModels: () => Promise<void>;
  loadState: ModelLoadState;
  loadError: string | null;
}

const InterviewSetupContext = createContext<InterviewSetupContextValue | null>(
  null,
);

interface InterviewSetupContextProviderProps {
  children: React.ReactNode;
}

export const InterviewSetupContextProvider = ({
  children,
}: InterviewSetupContextProviderProps) => {
  const [loadState, setLoadState] = useState<ModelLoadState>('idle');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [whisperLiteRTLoaded, setWhisperLiteRTLoaded] = useState(false);

  const loadModels = useCallback(async () => {
    setLoadState('loading');
    setLoadError(null);
    try {
      await playSilentAudio();
      await NitroLocalLLM.initialize(NitroFilesAPI.getModelPath(LLM_MODEL));
      await NitroKittenTTSML.loadModel(NitroFilesAPI.getModelPath(TTS_MODEL));
      await NitroWhisperML.loadVadModel(NitroFilesAPI.getModelPath(VAD_MODEL));

      if (Platform.OS === 'android') {
        await NitroWhisperLiteRT.loadModel(
          NitroFilesAPI.getModelPath(WHISPER_MODEL_LITERT),
        );
        setWhisperLiteRTLoaded(true);
      }

      await NitroWhisperML.loadModel(
        NitroFilesAPI.getModelPath(WHISPER_MODEL_GGML),
      );

      setLoadState('loaded');
    } catch (e: any) {
      console.log('Error', e);
      setLoadState('failed');
      setLoadError('Error in loading AI models');
    }
  }, []);

  const unloadModels = useCallback(async () => {
    // Release every engine, independently — one failing shouldn't skip the rest.
    await Promise.allSettled([
      NitroLocalLLM.endInterview(),
      NitroKittenTTSML.unloadModel(),
      whisperLiteRTLoaded && NitroWhisperLiteRT.unloadModels(),
      NitroWhisperML.unloadModels(),
    ]);
    setLoadState('idle');
    setLoadError(null);
  }, [whisperLiteRTLoaded]);

  const value = useMemo<InterviewSetupContextValue>(
    () => ({ loadModels, unloadModels, loadState, loadError }),
    [loadModels, unloadModels, loadState, loadError],
  );

  return (
    <InterviewSetupContext.Provider value={value}>
      {children}
    </InterviewSetupContext.Provider>
  );
};

export const useInterviewSetupContext = (): InterviewSetupContextValue => {
  const ctx = useContext(InterviewSetupContext);
  if (!ctx) {
    throw new Error(
      'useInterviewSetupContext must be used within an <InterviewSetupContextProvider>',
    );
  }
  return ctx;
};
