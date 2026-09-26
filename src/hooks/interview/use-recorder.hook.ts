import { useCallback, useEffect, useRef, useState } from 'react';
import Sound from 'react-native-sound';
import LiveAudioStream from 'react-native-live-audio-stream';
import { NitroWhisperML } from 'react-native-akki-ai';

import { decodeBase64PCM16ToFloat32 } from '@/utils';
import { RECORDING_SAMPLE_RATE } from '@/constants';
import { useSharedValue } from 'react-native-worklets-core';
import { usePermissions } from '../use-permissions.hook';

const RECORDING_IDLE_DURATION = 5000;

type RecordingStatus = 'idle' | 'recording' | 'finished' | 'failed';

interface UserRecorderOptions {
  resetTrigger: number;
  isManualRecording: boolean;
}

export const useRecorder = ({
  resetTrigger,
  isManualRecording,
}: UserRecorderOptions) => {
  const [recordingStatus, setRecordingStatus] =
    useState<RecordingStatus>('idle');
  const [isRecordingIdle, setIsRecordingIdle] = useState(false);

  const audioChunksRef = useRef<number[]>([]);
  const lastTakeRef = useRef<number[]>([]);
  const currentSoundRef = useRef<Sound | null>(null);
  const micLevelSV = useSharedValue(0);
  const runningMaxRef = useRef(0.1); // start with a small floor

  const { allGranted: micGranted, checkPermissions } = usePermissions(['mic']);

  useEffect(() => {
    if (!micGranted) return;

    LiveAudioStream.init({
      sampleRate: RECORDING_SAMPLE_RATE,
      channels: 1,
      bitsPerSample: 16,
      bufferSize: 4096,
      wavFile: '',
    });

    LiveAudioStream.on('data', (data: string) => {
      const chunk = decodeBase64PCM16ToFloat32(data);
      for (let i = 0; i < chunk.length; i++) {
        audioChunksRef.current.push(chunk[i]);
      }
      let peak = 0;
      for (let i = 0; i < chunk.length; i++) {
        const a = Math.abs(chunk[i]);
        if (a > peak) peak = a;
      }

      // update running max: rise instantly to new peaks, decay slowly
      runningMaxRef.current = Math.max(
        peak,
        runningMaxRef.current * 0.999, // slow decay so it adapts to quieter periods
      );

      // floor so we never divide by ~0 in silence
      const ceiling = Math.max(runningMaxRef.current, 0.05);

      // normalized 0..1 relative to recent loudness
      const normalized = Math.min(peak / ceiling, 1);

      // smooth for the UI
      micLevelSV.value = micLevelSV.value * 0.6 + normalized * 0.4;
    });

    return () => {
      LiveAudioStream.stop();
      currentSoundRef.current?.release();
    };
  }, [micGranted]);

  const startRecording = useCallback(async () => {
    if (!micGranted) return;
    audioChunksRef.current = [];
    micLevelSV.value = 0;
    LiveAudioStream.start();
    setRecordingStatus('recording');
  }, [micGranted]);

  const stopRecording = useCallback(() => {
    LiveAudioStream.stop();

    // const trimmed = audioChunksRef.current.slice(
    //   speechStartRef.current * RECORDING_SAMPLE_RATE,
    //   speechEndRef.current * RECORDING_SAMPLE_RATE,
    // );

    // lastTakeRef.current = trimmed;

    lastTakeRef.current = audioChunksRef.current;

    setRecordingStatus('finished');
  }, []);

  /** Plays the current take back. Rejects if WAV encode/playback fails. */
  // const playRecording = useCallback(async () => {
  //   let wavPath = NitroFilesAPI.floatBufferToWav(
  //     new Float32Array(lastTakeRef.current).buffer,
  //     RECORDING_SAMPLE_RATE,
  //   );

  //   const sound = new Sound(wavPath, '', err => {
  //     if (!err) {
  //       currentSoundRef.current = sound;
  //       sound.play(() => {
  //         sound.release();
  //         currentSoundRef.current = null;
  //       });
  //     }
  //   });
  // }, []);

  const getRecordingSamples = useCallback(() => lastTakeRef.current, []);

  /*
  ---------------------------------------------------------------------------
  VAD auto-stop: while recording, poll the last ~2s of audio through the
  Silero VAD model. Once the user has spoken, if we see N consecutive silent
  windows, call the existing stopRecording(). Self-contained - touches nothing
  above.
  ---------------------------------------------------------------------------
  */

  // --- VAD tuning ---
  const VAD_WINDOW_SEC = 2; // how much recent audio to inspect each tick
  const VAD_SILENT_TURNS_TO_STOP = 1; // consecutive silent windows -> stop
  const VAD_SILENT_DURATION_SEC = 1.5;

  // Refs so the polling loop doesn't churn on re-render.
  const hasSpokenRef = useRef(false); // user has spoken at least once
  const silentTurnsRef = useRef(0); // consecutive silent windows so far
  const speechStartRef = useRef(0);
  const speechEndRef = useRef(0);

  useEffect(() => {
    if (recordingStatus === 'recording' && !isManualRecording) {
      const timeoutId = setTimeout(() => {
        if (!hasSpokenRef.current) {
          setIsRecordingIdle(true);
        }
      }, RECORDING_IDLE_DURATION);

      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [recordingStatus, isRecordingIdle]);

  useEffect(() => {
    if (recordingStatus !== 'recording' && isManualRecording) return;

    let timeoutId: number;

    const timeoutSetter = (ms: number) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        tick();
      }, ms);
    };

    // Fresh arm: reset per-session VAD state.
    hasSpokenRef.current = false;
    silentTurnsRef.current = 0;

    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;

      const buffer = audioChunksRef.current;
      const windowSamples = VAD_WINDOW_SEC * RECORDING_SAMPLE_RATE;
      if (buffer.length < windowSamples) {
        timeoutSetter(500);
        return;
      } // not enough audio yet

      const tail = buffer.slice(-windowSamples); // keep ~2s for VAD accuracy

      try {
        const segments = await NitroWhisperML.detectSpeechSegments(tail);

        const windowDurationSec = tail.length / RECORDING_SAMPLE_RATE;
        let isSilentNow = true;
        if (segments.length > 0) {
          if (!hasSpokenRef.current) {
            const firstSpeechStart = segments[0].start;
            speechStartRef.current = firstSpeechStart;
          }

          const lastSpeechEnd = segments[segments.length - 1].end; // seconds into window
          speechEndRef.current = lastSpeechEnd;

          const trailingSilence = windowDurationSec - lastSpeechEnd;
          isSilentNow = trailingSilence > VAD_SILENT_DURATION_SEC;
        }

        if (!isSilentNow) {
          hasSpokenRef.current = true;
          silentTurnsRef.current = 0;
          setIsRecordingIdle(false);
        } else if (hasSpokenRef.current) {
          silentTurnsRef.current += 1;
          if (silentTurnsRef.current >= VAD_SILENT_TURNS_TO_STOP) {
            if (!isManualRecording) {
              stopRecording();
            }
          }
        }
      } catch {
        // Ignore a failed detect; the next tick will try again.
      } finally {
      }
      timeoutSetter(500);
    };

    timeoutSetter(1000);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [recordingStatus, isManualRecording, stopRecording]);

  useEffect(() => {
    setRecordingStatus('idle');
    setIsRecordingIdle(false);
    audioChunksRef.current = [];
    lastTakeRef.current = [];
    currentSoundRef.current = null;
    micLevelSV.value = 0;
    speechStartRef.current = 0;
    speechEndRef.current = 0;
  }, [resetTrigger]);

  return {
    recordingStatus,
    micLevelSV,
    isRecordingIdle,
    startRecording,
    stopRecording,
    // playRecording,
    getRecordingSamples,
  };
};
