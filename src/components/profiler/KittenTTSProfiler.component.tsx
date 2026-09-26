import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Text, ScrollView, StyleSheet } from 'react-native';

import { useThemedStyles } from '@/contexts';
import { themedStylesFactory } from '@/utils';
import {
  ActionButton,
  Card,
  ErrorText,
  MetricGrid,
  errorMessage,
  formatMs,
} from './ProfilerUI.component';

import {
  TTSLoadProfile,
  TTSSynthesisProfile,
} from 'react-native-akki-ai/lib/specs/KittenTTSML.nitro';
import { NitroFilesAPI, NitroKittenTTSML } from 'react-native-akki-ai';
import { TTS_MODEL } from '@/constants';

// Fixed sentences so every device runs the exact same work.
// Lengths match what the sentence builder sends: one sentence at a time.
const SENTENCES: { size: 'short' | 'medium' | 'long'; text: string }[] = [
  { size: 'short', text: 'Good answer.' },
  { size: 'short', text: 'Can you give me an example?' },
  { size: 'short', text: 'Tell me about yourself.' },
  {
    size: 'medium',
    text: 'That makes sense, and I like that you measured the impact of the change.',
  },
  {
    size: 'medium',
    text: 'How would you debug a screen that drops frames only on older Android phones?',
  },
  {
    size: 'medium',
    text: 'You mentioned native modules, so walk me through how JavaScript calls into C++.',
  },
  {
    size: 'long',
    text: 'That is a reasonable approach, but I would like you to be more specific about how you decided which parts of the list to memoize and how you verified that it actually helped.',
  },
  {
    size: 'long',
    text: 'Imagine the app works well on flagship devices but crashes on phones with four gigabytes of memory, so tell me how you would find the cause and what you would change first.',
  },
  {
    size: 'long',
    text: 'Before we move on, describe a time when you disagreed with a technical decision on your team, what you did about it, and what the final outcome was for the project.',
  },
];

type SynthResult = {
  index: number;
  size: 'short' | 'medium' | 'long';
  text: string;
  profile: TTSSynthesisProfile;
};

type LoadState = 'idle' | 'loading' | 'loaded' | 'unloading';

const rtfOf = (p: TTSSynthesisProfile) =>
  p.audioMs > 0 ? p.timeMs / p.audioMs : 0;

const median = (values: number[]) => {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

const KittenTTSProfiler: React.FC = () => {
  const styles = useThemedStyles(stylesFactory);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [loadResult, setLoadResult] = useState<TTSLoadProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState(0);
  const [results, setResults] = useState<SynthResult[]>([]);
  const [runError, setRunError] = useState<string | null>(null);

  const loadedRef = useRef(false);

  // Free the model when leaving the tab so it doesn't skew other tabs' numbers.
  useEffect(() => {
    return () => {
      if (loadedRef.current) NitroKittenTTSML.unloadModel().catch(() => {});
    };
  }, []);

  const MODEL_PATH = useMemo(() => {
    return NitroFilesAPI.getModelPath(TTS_MODEL);
  }, []);

  const loadModel = async () => {
    setLoadState('loading');
    setLoadError(null);
    try {
      const r = await NitroKittenTTSML.loadModel(MODEL_PATH);
      console.log(r);
      loadedRef.current = true;
      setLoadResult(r);
      setLoadState('loaded');
    } catch (e) {
      setLoadError(errorMessage(e));
      setLoadState('idle');
    }
  };

  const unloadModel = async () => {
    setLoadState('unloading');
    try {
      await NitroKittenTTSML.unloadModel();
    } catch (e) {
      setLoadError(errorMessage(e));
    } finally {
      loadedRef.current = false;
      setLoadResult(null);
      setLoadState('idle');
    }
  };

  const runSentences = async () => {
    setRunning(true);
    setRunError(null);
    setResults([]);
    try {
      for (let i = 0; i < SENTENCES.length; i++) {
        setCurrent(i + 1);
        const { size, text } = SENTENCES[i];
        // Only the profile is kept; the audio buffer is dropped right away.
        const { profile } = await NitroKittenTTSML.synthesize(text);
        setResults(prev => [{ index: i + 1, size, text, profile }, ...prev]); // newest on top
      }
    } catch (e) {
      setRunError(errorMessage(e));
    } finally {
      setRunning(false);
      setCurrent(0);
    }
  };

  const loaded = loadState === 'loaded';
  const loadBusy = loadState === 'loading' || loadState === 'unloading';

  // Summary skips sentence 1: the first Run() after load pays one-time setup.
  const warm = results.filter(r => r.index > 1).map(r => rtfOf(r.profile));
  const showSummary = !running && warm.length > 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card title="Load model">
        {loadResult ? (
          <MetricGrid
            metrics={[
              { label: 'Load time', value: formatMs(loadResult.timeMs) },
            ]}
          />
        ) : (
          <Text style={styles.muted}>
            {loadBusy ? 'Loading the model…' : 'The model is not loaded.'}
          </Text>
        )}
        <ErrorText message={loadError} />
        <ActionButton
          label={loaded ? 'Unload model' : 'Load model'}
          variant={loaded ? 'secondary' : 'primary'}
          busy={loadBusy}
          disabled={running}
          onPress={loaded ? unloadModel : loadModel}
        />
      </Card>

      <Card
        title="Sentence run"
        description={`${SENTENCES.length} fixed sentences: short, medium and long.`}
      >
        {running ? (
          <Text style={styles.progress}>
            Synthesizing sentence {current} of {SENTENCES.length}
          </Text>
        ) : null}
        {showSummary ? (
          <MetricGrid
            metrics={[
              { label: 'Median RTF', value: median(warm).toFixed(2) },
              { label: 'Worst RTF', value: Math.max(...warm).toFixed(2) },
            ]}
          />
        ) : null}
        <ErrorText message={runError} />
        <ActionButton
          label={`Run ${SENTENCES.length} sentences`}
          busy={running}
          disabled={!loaded}
          onPress={runSentences}
        />
      </Card>

      {results.length === 0 ? (
        <Text style={styles.muted}>
          {loaded
            ? 'Sentence results will appear here, newest first.'
            : 'Load the model to run the sentences.'}
        </Text>
      ) : (
        results.map(item => <SentenceResult key={item.index} item={item} />)
      )}
    </ScrollView>
  );
};

const SentenceResult: React.FC<{ item: SynthResult }> = ({ item }) => {
  const styles = useThemedStyles(stylesFactory);
  const { profile } = item;
  const rtf = rtfOf(profile);

  return (
    <Card
      title={`Sentence ${item.index}`}
      description={
        item.index === 1 ? `${item.size}, first run after load` : item.size
      }
    >
      <MetricGrid
        metrics={[
          {
            label: 'RTF',
            value: rtf.toFixed(2),
            detail: 'time ÷ audio length',
          },
          { label: 'Audio length', value: formatMs(profile.audioMs) },
          { label: 'Total time', value: formatMs(profile.timeMs) },
          { label: 'Inference', value: formatMs(profile.inferenceMs) },
          { label: 'Phonemize', value: formatMs(profile.phonemizeMs) },
        ]}
      />
      <Text
        style={[styles.response, rtf >= 1 && styles.slow]}
        numberOfLines={2}
      >
        {rtf >= 1 ? 'Slower than real time: ' : ''}
        {item.text}
      </Text>
    </Card>
  );
};

export default KittenTTSProfiler;

const stylesFactory = themedStylesFactory(t =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.bg,
    },
    content: {
      padding: 12,
      paddingBottom: 24,
      gap: 12,
    },
    muted: {
      fontSize: 13,
      color: t.textSecondary,
    },
    progress: {
      fontSize: 14,
      fontWeight: '500',
      color: t.gold,
    },
    response: {
      fontSize: 13,
      lineHeight: 18,
      color: t.textSecondary,
    },
    slow: {
      color: t.rose,
    },
  }),
);
