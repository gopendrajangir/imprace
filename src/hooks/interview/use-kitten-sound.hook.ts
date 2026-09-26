import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioContext, AudioManager } from 'react-native-audio-api';
import type {
  AudioBuffer,
  AudioBufferSourceNode,
} from 'react-native-audio-api';
import { KittenResult } from './use-kitten-tts.hook';

export type SoundStatus = 'idle' | 'playing' | 'finished' | 'failed';

export interface KittenSoundResult {
  index: number;
  played: boolean;
  sentence: string;
}

const PROGRESS_INTERVAL_MS = 100;

interface UseSoundOptions {
  kittenResult: KittenResult[];
  resetTrigger: number;
  stopped: boolean;
}

// Must run BEFORE any AudioContext is created (module load is fine).
// playAndRecord + defaultToSpeaker => phone loudspeaker/mic by default;
// allowBluetooth lets a connected headset take over automatically (Goal 1).
AudioManager.setAudioSessionOptions({
  iosCategory: 'playAndRecord',
  iosMode: 'spokenAudio',
  iosOptions: ['defaultToSpeaker', 'allowBluetoothHFP', 'allowAirPlay'],
});

export const useKittenSound = ({
  kittenResult,
  resetTrigger,
  stopped,
}: UseSoundOptions) => {
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [playingIndex, setPlayingIndex] = useState<number>(-1);
  const [kittenSoundResult, setKittenSoundResult] = useState<
    KittenSoundResult[]
  >([]);

  const ctxRef = useRef<AudioContext | null>(null);
  if (!ctxRef.current) ctxRef.current = new AudioContext();

  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const manualStopRef = useRef(false);

  const stoppedRef = useRef(false);
  stoppedRef.current = stopped;

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
    (wavPath: string): Promise<boolean> =>
      new Promise(async resolve => {
        const ctx = ctxRef.current;
        if (!ctx) return resolve(false);

        clearTimer();
        let settled = false;
        const finish = (ok: boolean) => {
          if (settled) return;
          settled = true;
          clearTimer();
          sourceRef.current = null;
          setIsPlaying(false);
          resolve(ok);
        };

        try {
          // decodeAudioData(path) on current versions; older builds expose
          // ctx.decodeAudioDataSource(path). buffer.duration is exact (Goal 3).
          const buffer: AudioBuffer = await ctx.decodeAudioData(wavPath);
          if (stoppedRef.current) return finish(false);

          setDuration(buffer.duration);
          setProgress(0);

          const source = ctx.createBufferSource(); // (on web: await this)
          source.buffer = buffer;
          source.connect(ctx.destination);
          sourceRef.current = source;

          if (ctx.state === 'suspended') await ctx.resume();

          const startedAt = ctx.currentTime;
          manualStopRef.current = false;

          source.onEnded = () => {
            setProgress(1);
            finish(!manualStopRef.current); // stop() => played:false
          };

          source.start(startedAt);
          setIsPlaying(true);
          setIsPaused(false);

          timerRef.current = setInterval(() => {
            const c = ctxRef.current;
            if (!c || buffer.duration <= 0) return;
            const elapsed = c.currentTime - startedAt; // frozen while suspended
            setProgress(Math.min(Math.max(elapsed / buffer.duration, 0), 1));
          }, PROGRESS_INTERVAL_MS);
        } catch {
          finish(false);
        }
      }),
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
      const ok = item.path ? await playOne(item.path) : false;
      setKittenSoundResult(r => [
        ...r,
        { index: item.index, played: ok, sentence: item.sentence },
      ]);
    } finally {
      indexRef.current = index + 1;
      isPlayingRef.current = false;
      processNext();
    }
  }, [playOne]);

  useEffect(() => {
    processNext();
  }, [kittenResult, processNext]);

  // --- Goal 2: pause / resume + system interruption events ---
  const pause = useCallback(async () => {
    const ctx = ctxRef.current;
    if (ctx && ctx.state === 'running') {
      await ctx.suspend();
      setIsPlaying(false);
      setIsPaused(true);
    }
  }, []);

  const resume = useCallback(async () => {
    const ctx = ctxRef.current;
    if (ctx && ctx.state === 'suspended') {
      await ctx.resume();
      setIsPlaying(true);
      setIsPaused(false);
    }
  }, []);

  useEffect(() => {
    AudioManager.observeAudioInterruptions(true);
    const sub = AudioManager.addSystemEventListener(
      'interruption',
      (e: any) => {
        if (e?.type === 'began') {
          pause(); // suspends + flips isPaused => your Continue button shows
        }
        // on 'ended' we intentionally DO NOT auto-resume — user taps Continue.
      },
    );
    return () => sub?.remove();
  }, [pause]);

  const stop = useCallback(() => {
    manualStopRef.current = true;
    clearTimer();
    const source = sourceRef.current;
    if (source) {
      try {
        source.stop();
      } catch {}
      sourceRef.current = null;
    }
    setIsPlaying(false);
  }, [clearTimer]);

  useEffect(() => {
    if (stopped) stop();
  }, [stop, stopped]);

  // reset (keep the shared context alive — it's the expensive object)
  useEffect(() => {
    clearTimer();
    const source = sourceRef.current;
    if (source) {
      try {
        source.stop();
      } catch {}
      sourceRef.current = null;
    }
    setProgress(0);
    setDuration(0);
    setPlayingIndex(0);
    setIsPlaying(false);
    setIsPaused(false);
    setKittenSoundResult([]);
    indexRef.current = 0;
    isPlayingRef.current = false;
  }, [resetTrigger, clearTimer]);

  // close the context only on unmount
  useEffect(() => {
    return () => {
      clearTimer();
      const source = sourceRef.current;
      if (source) {
        try {
          source.stop();
        } catch {}
        sourceRef.current = null;
      }
      ctxRef.current?.close();
      ctxRef.current = null;
    };
  }, [clearTimer]);

  return {
    kittenSoundResult,
    playingIndex,
    soundProgress: progress,
    soundDuration: duration,
    isPlaying,
    isPaused, // new
    pause, // new
    resume, // new (wire your Continue button here)
    stop,
  };
};
