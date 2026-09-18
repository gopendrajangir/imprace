import { useCallback, useEffect, useRef, useState } from 'react';
import Sound from 'react-native-sound';
import { KittenResult } from './use-kitten-tts.hook';

export type SoundStatus = 'idle' | 'playing' | 'finished' | 'failed';

// One playback outcome per kitten result we consumed, in play order.
export interface KittenSoundResult {
  index: number; // matches KittenResult.index, for correlation/caption sync
  played: boolean; // true if it actually played to completion
  sentence: string;
}

const PROGRESS_INTERVAL_MS = 100;

interface UseSoundOptions {
  kittenResult: KittenResult[];
  resetTrigger: number;
  stopped: boolean;
}

export const useKittenSound = ({
  kittenResult,
  resetTrigger,
  stopped,
}: UseSoundOptions) => {
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const [playingIndex, setPlayingIndex] = useState<number>(-1);

  const [kittenSoundResult, setKittenSoundResult] = useState<
    KittenSoundResult[]
  >([]);

  const soundRef = useRef<Sound | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stoppedRef = useRef(false);

  stoppedRef.current = stopped;

  // Same consumer machinery as the TTS hook: a cursor into kittenResult, a
  // one-at-a-time guard, and a live ref so the async loop always reads the
  // latest array (avoids the stale-closure bug).
  const indexRef = useRef(0);
  const isPlayingRef = useRef(false);
  const kittenResultRef = useRef(kittenResult);
  kittenResultRef.current = kittenResult;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const playOne = useCallback(
    (wavPath: string): Promise<boolean> => {
      return new Promise(resolve => {
        clearTimer();
        soundRef.current?.release();
        soundRef.current = null;

        const sound = new Sound(wavPath, '', err => {
          if (err) {
            resolve(false);
            return;
          }
          soundRef.current = sound;
          const dur = sound.getDuration();
          setDuration(dur);
          setProgress(0);
          setIsPlaying(true);

          timerRef.current = setInterval(() => {
            sound.getCurrentTime(seconds => {
              if (dur > 0 && soundRef.current) {
                setProgress(Math.min(seconds / dur, 1));
              }
            });
          }, PROGRESS_INTERVAL_MS);

          if (!stoppedRef.current) {
            sound.play(success => {
              soundRef.current = null;
              clearTimer();
              setIsPlaying(false);
              setProgress(1);
              sound.release();
              resolve(success);
            });
          }
        });
      });
    },
    [clearTimer],
  );

  const processNext = useCallback(async () => {
    const results = kittenResultRef.current;

    if (isPlayingRef.current) return;
    if (indexRef.current >= results.length) return;

    isPlayingRef.current = true;

    const index = indexRef.current;
    const item = results[index];

    setPlayingIndex(index);
    setProgress(0);

    try {
      if (item.path) {
        const ok = await playOne(item.path);
        setKittenSoundResult(r => [
          ...r,
          { index: item.index, played: ok, sentence: item.sentence },
        ]);
      } else {
        setKittenSoundResult(r => [
          ...r,
          { index: item.index, played: false, sentence: item.sentence },
        ]);
      }
    } finally {
      indexRef.current = index + 1;
      isPlayingRef.current = false;
      processNext();
    }
  }, [playOne]);

  useEffect(() => {
    processNext();
  }, [kittenResult, processNext]);

  const stop = useCallback(() => {
    clearTimer();
    if (soundRef.current) {
      soundRef.current.stop(() => {
        soundRef.current?.release();
        soundRef.current = null;
      });
    }
  }, [clearTimer]);

  useEffect(() => {
    if (stopped) {
      stop();
    }
  }, [stop, stopped]);

  // Release on unmount so we don't leak a Sound instance.
  useEffect(() => {
    return () => {
      clearTimer();
      soundRef.current?.release();
      soundRef.current = null;
    };
  }, [clearTimer]);

  useEffect(() => {
    clearTimer();
    soundRef.current?.release();
    soundRef.current = null;

    setProgress(0);
    setDuration(0);
    setPlayingIndex(0);
    setKittenSoundResult([]);
    indexRef.current = 0;
    isPlayingRef.current = false;
  }, [resetTrigger, clearTimer]);

  return {
    kittenSoundResult,
    playingIndex,
    soundProgress: progress,
    soundDuration: duration,
    isPlaying,
    stop,
  };
};
