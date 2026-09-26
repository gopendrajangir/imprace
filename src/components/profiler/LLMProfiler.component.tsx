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
  profileMetrics,
} from './ProfilerUI.component';

import {
  GenerationProfileResult,
  ProfileResult,
} from 'react-native-akki-ai/lib/specs/LocalLLM.nitro';
import { NitroFilesAPI, NitroLocalLLM } from 'react-native-akki-ai';
import { LLM_MODEL } from '@/constants';

const ITERATIONS = 10; // 1 startInterview + 9 prompts

const USER_INFO = `Name: Test Candidate
Role applied for: Senior React Native Engineer
Experience: 4 years building cross-platform apps with React Native and TypeScript.
Skills: React Native, TypeScript, native modules (Kotlin, Swift), performance profiling, CI/CD.`;

// Fixed answers so every device runs the exact same conversation.
const CANDIDATE_ANSWERS = [
  'Hi, thanks for having me. I have spent the last four years building React Native apps, mostly in fintech, and lately I have been writing native modules in Kotlin and Swift.',
  'The hardest bug I fixed was a memory leak in a list screen. Images were never released because a native cache held strong references, so I moved it to a weak cache and memory dropped by about 40 percent.',
  'I usually start with the React DevTools profiler to find unnecessary re-renders, then use memoization and FlatList tuning like getItemLayout and windowSize.',
  'For state management I prefer keeping server state in React Query and local UI state in context or Zustand, because a single global store tends to cause re-render problems.',
  'The new architecture replaces the bridge with JSI, so JavaScript can call native code directly and synchronously, and Fabric renders on multiple threads.',
  'I write unit tests with Jest for logic and use Detox for the main user flows. For native modules I add small instrumented tests on Android.',
  'When I disagree with a teammate I try to write down both options with their tradeoffs and, if we can, build a quick prototype so the decision is based on data.',
  'I once shipped a release that crashed on older Android versions because of a missing API level check. I rolled it back, added the check, and set up a device matrix in CI.',
  'In the next few years I want to go deeper into on-device machine learning on mobile, because I think running models locally is where a lot of interesting work is.',
];

type IterationResult = {
  turn: number;
  kind: 'startInterview' | 'prompt';
  result: GenerationProfileResult;
  response: string;
};

type LoadState = 'idle' | 'loading' | 'loaded' | 'unloading';

const LLMProfiler: React.FC = () => {
  const styles = useThemedStyles(stylesFactory);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [loadResult, setLoadResult] = useState<ProfileResult | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [running, setRunning] = useState(false);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [results, setResults] = useState<IterationResult[]>([]);
  const [runError, setRunError] = useState<string | null>(null);

  const loadedRef = useRef(false);

  // Free the model when leaving the tab so it doesn't skew other tabs' numbers.
  useEffect(() => {
    return () => {
      if (loadedRef.current) NitroLocalLLM.endInterview().catch(() => {});
    };
  }, []);

  const MODEL_PATH = useMemo(() => {
    return NitroFilesAPI.getModelPath(LLM_MODEL);
  }, []);

  const loadModel = async () => {
    setLoadState('loading');
    setLoadError(null);
    try {
      const r = await NitroLocalLLM.initialize(MODEL_PATH);
      console.log('Result', r);
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
      await NitroLocalLLM.endInterview();
    } catch (e) {
      setLoadError(errorMessage(e));
    } finally {
      loadedRef.current = false;
      setLoadResult(null);
      setLoadState('idle');
    }
  };

  const runIterations = async () => {
    setRunning(true);
    setRunError(null);
    setResults([]);
    try {
      for (let i = 0; i < ITERATIONS; i++) {
        setCurrentTurn(i + 1);
        let response = '';
        const onChunk = (chunk: string) => {
          response += chunk;
        };

        const isFirst = i === 0;
        const result = isFirst
          ? await NitroLocalLLM.startInterview(USER_INFO, '', false, onChunk)
          : await NitroLocalLLM.prompt(CANDIDATE_ANSWERS[i - 1], onChunk);

        const item: IterationResult = {
          turn: i + 1,
          kind: isFirst ? 'startInterview' : 'prompt',
          result,
          response,
        };
        setResults(prev => [item, ...prev]); // newest on top
      }
    } catch (e) {
      setRunError(errorMessage(e));
    } finally {
      setRunning(false);
      setCurrentTurn(0);
    }
  };

  const loaded = loadState === 'loaded';
  const loadBusy = loadState === 'loading' || loadState === 'unloading';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card title="Load model">
        {loadResult ? (
          <MetricGrid metrics={profileMetrics(loadResult)} />
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
        title="Conversation run"
        description={`1 startInterview + ${
          ITERATIONS - 1
        } prompts with fixed answers.`}
      >
        {running ? (
          <Text style={styles.progress}>
            Running turn {currentTurn} of {ITERATIONS}
          </Text>
        ) : null}
        <ErrorText message={runError} />
        <ActionButton
          label={`Run ${ITERATIONS} turns`}
          busy={running}
          disabled={!loaded}
          onPress={runIterations}
        />
      </Card>

      {results.length === 0 ? (
        <Text style={styles.muted}>
          {loaded
            ? 'Turn results will appear here, newest first.'
            : 'Load the model to run the conversation.'}
        </Text>
      ) : (
        results.map(item => <TurnResult key={item.turn} item={item} />)
      )}
    </ScrollView>
  );
};

const TurnResult: React.FC<{ item: IterationResult }> = ({ item }) => {
  const styles = useThemedStyles(stylesFactory);
  const { result } = item;

  return (
    <Card title={`Turn ${item.turn}`} description={item.kind}>
      <MetricGrid
        metrics={[
          { label: 'Time to first token', value: formatMs(result.ttftMs) },
          {
            label: 'Decode speed',
            value:
              result.decodeTokensPerSec > 0
                ? `${result.decodeTokensPerSec.toFixed(1)} tok/s`
                : '–',
          },
          ...profileMetrics(result),
        ]}
      />
      <Text style={styles.response} numberOfLines={3}>
        {item.response.trim() || '(no text)'}
      </Text>
    </Card>
  );
};

export default LLMProfiler;

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
  }),
);
