import { useEffect, useState } from 'react';

import { useInterviewLLM } from './use-llm.hook';
import { useKittenTTS } from './use-kitten-tts.hook';
import { useKittenSound } from './use-kitten-sound.hook';
import { useRecorder } from './use-recorder.hook';
import { useWhisper } from './use-whisper.hook';

export const useInterviewFlow = (stopped: boolean) => {
  const [isManualRecording, setIsManualRecording] = useState(false);
  const [conversationVersion, setConversationVersion] = useState(0);
  const [synthesizeError, setSynthesizeError] = useState<string | null>(null);
  const [soundPlayError, setSoundPlayError] = useState<string | null>(null);

  const {
    llmStatus,
    interviewStartStatus,
    sentences,
    llmInferenceTime,
    llmError,
    startInterview,
    talkToAI,
  } = useInterviewLLM();

  const { kittenResult, kittenInferenceTime } = useKittenTTS({
    sentences,
    resetTrigger: conversationVersion,
  });

  const {
    isPlaying,
    isPaused,
    kittenSoundResult,
    playingIndex,
    soundProgress,
    soundDuration,
    resume,
  } = useKittenSound({
    kittenResult,
    resetTrigger: conversationVersion,
    stopped,
  });

  const {
    recordingStatus,
    micLevelSV,
    isRecordingIdle,
    getRecordingSamples,
    startRecording,
    stopRecording,
  } = useRecorder({ isManualRecording, resetTrigger: conversationVersion });

  const {
    transcribeStatus,
    transcribedText,
    whisperInferenceTime,
    transcribeError,
    transcribe,
  } = useWhisper({ isRecording: recordingStatus === 'recording' });

  useEffect(() => {
    if (
      llmStatus === 'finished' &&
      sentences.length === kittenSoundResult.length
    ) {
      if (!isManualRecording) {
        startRecording();
      }
    }
  }, [
    llmStatus,
    sentences,
    kittenSoundResult,
    isManualRecording,
    startRecording,
  ]);

  useEffect(() => {
    if (
      llmStatus === 'finished' &&
      sentences.length === kittenSoundResult.length
    ) {
      if (kittenResult.some(v => !v.success)) {
        setSynthesizeError('Error while synthesizing voice');
      }
      if (kittenSoundResult.some(v => !v.played)) {
        setSynthesizeError('Could not play voice');
      }
    }
  }, [llmStatus, sentences, kittenResult, kittenSoundResult]);

  useEffect(() => {
    if (recordingStatus === 'finished') {
      transcribe(getRecordingSamples());
    }
  }, [recordingStatus]);

  useEffect(() => {
    if (transcribedText) {
      setConversationVersion(v => v + 1);
      talkToAI(transcribedText);
    } else if (transcribeStatus === 'failed') {
      talkToAI("[User's voice could not be transcribed]");
    }
  }, [transcribedText, transcribeStatus]);

  useEffect(() => {
    setSoundPlayError(null);
    setSynthesizeError(null);
  }, [conversationVersion, stopped]);

  const isInterviewerSpeaking =
    llmStatus !== 'finished' || sentences.length !== kittenSoundResult.length;

  return {
    interviewStartStatus,
    recordingStatus,
    transcribeStatus,

    transcribeError,
    soundPlayError,
    synthesizeError,
    llmError,

    transcribedText,
    playingIndex,
    soundProgress,
    soundDuration,
    kittenResult,
    kittenSoundResult,
    isPlaying,
    isPaused,
    isRecordingIdle,
    isManualRecording,
    isInterviewerSpeaking,

    micLevelSV,

    llmInferenceTime,
    kittenInferenceTime,
    whisperInferenceTime,

    startInterview,
    setIsManualRecording,
    startRecording,
    stopRecording,
    resume,
  };
};
