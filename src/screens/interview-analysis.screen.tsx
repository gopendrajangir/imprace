import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamsList } from '@/navigation/navigation.types';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { NavigationProp, useNavigation } from '@react-navigation/native';

import {
  analyzeInterview,
  InterviewAnalysis,
  SCORE_LABELS,
  ScoreKey,
  themedStylesFactory,
} from '@/utils';
import { useInterviewSetupContext, useThemedStyles } from '@/contexts';

type Props = NativeStackScreenProps<RootStackParamsList, 'InterviewAnalysis'>;
type Status = 'loading' | 'success' | 'error';
type Closing = 'idle' | 'loading' | 'error';

export const InterviewAnalysisScreen: React.FC<Props> = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamsList>>();
  const styles = useThemedStyles(stylesFactory);

  const [status, setStatus] = useState<Status>('loading');
  const [analysis, setAnalysis] = useState<InterviewAnalysis | null>(null);

  const requestId = useRef(0);
  const pulse = useRef(new Animated.Value(0)).current;
  const reveal = useRef(new Animated.Value(0)).current;

  const runAnalysis = useCallback(async () => {
    const id = ++requestId.current;
    setStatus('loading');
    setAnalysis(null);
    reveal.setValue(0);

    try {
      const result = await analyzeInterview();
      if (id !== requestId.current) return; // stale or unmounted
      setAnalysis(result);
      setStatus('success');
    } catch (err) {
      if (id !== requestId.current) return;
      console.log(err);
      setStatus('error');
    }
  }, [reveal]);

  useEffect(() => {
    runAnalysis();
    return () => {
      requestId.current++;
    };
  }, []);

  // The interview is over, so hardware back should not return to it.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  // Slow pulse while the model is thinking.
  useEffect(() => {
    if (status !== 'loading') return;
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1800,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    pulse.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [status, pulse]);

  // One reveal when the analysis arrives.
  useEffect(() => {
    if (status !== 'success') return;
    Animated.timing(reveal, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [status, reveal]);

  const { unloadModels } = useInterviewSetupContext();
  const [closing, setClosing] = useState<Closing>('idle');

  const onDone = async () => {
    if (closing === 'loading') return;
    setClosing('loading');
    try {
      await unloadModels();
      navigation.goBack();
    } catch (err) {
      console.log('Error while unloading models: ', err);
      setClosing('error');
    }
  };

  // Escape hatch: hardware back is blocked, so a failed unload must not trap the user here.
  const onLeaveAnyway = () => {
    navigation.goBack();
  };

  const ringStyle = {
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
    transform: [
      {
        scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] }),
      },
    ],
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.body}>
        {status === 'loading' && (
          <View style={styles.centered}>
            <View style={styles.pulseWrap}>
              <Animated.View style={[styles.pulseRing, ringStyle]} />
              <View style={styles.pulseCore} />
            </View>
            <Text style={styles.title}>Analyzing your interview</Text>
            <Text style={styles.subtitle}>
              This can take a minute. Your feedback will show up here.
            </Text>
          </View>
        )}

        {status === 'error' && (
          <View style={styles.centered}>
            <View style={styles.errorMark}>
              <Text style={styles.errorMarkText}>!</Text>
            </View>
            <Text style={styles.title}>Couldn't generate your feedback</Text>
            <Text style={styles.subtitle}>
              The analysis didn't finish. Try again, or head back and start a
              new interview.
            </Text>
          </View>
        )}

        {status === 'success' && analysis && (
          <Animated.View style={[styles.flex, { opacity: reveal }]}>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.heading}>Interview feedback</Text>

              {Object.keys(analysis.breakdown).length > 0 && (
                <View style={styles.card}>
                  {analysis.overallScore !== null && (
                    <View>
                      <Text style={styles.cardTitle}>Overall score</Text>
                      <View style={styles.overallRow}>
                        <Text style={styles.overallValue}>
                          {analysis.overallScore}
                        </Text>
                        <Text style={styles.overallMax}>/ 100</Text>
                      </View>
                    </View>
                  )}
                  {(Object.keys(SCORE_LABELS) as ScoreKey[]).map(key => {
                    const value = analysis.breakdown[key];
                    if (value === undefined) return null;
                    return (
                      <View key={key} style={styles.barRow}>
                        <View style={styles.barHeader}>
                          <Text style={styles.barLabel}>
                            {SCORE_LABELS[key]}
                          </Text>
                          <Text style={styles.barValue}>{value}/10</Text>
                        </View>
                        <View style={styles.barTrack}>
                          <View
                            style={[
                              styles.barFill,
                              { width: `${value * 10}%` },
                            ]}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {analysis.summary.length > 0 && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Summary</Text>
                  <Text style={styles.bodyText}>{analysis.summary}</Text>
                </View>
              )}

              {analysis.strengths.length > 0 && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>What went well</Text>
                  {analysis.strengths.map((item, i) => (
                    <View key={i} style={styles.row}>
                      <View style={[styles.dot, styles.dotTeal]} />
                      <Text style={[styles.bodyText, styles.rowText]}>
                        {item}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {analysis.weaknesses.length > 0 && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>What to work on</Text>
                  {analysis.weaknesses.map((item, i) => (
                    <View key={i} style={styles.row}>
                      <View style={[styles.dot, styles.dotGold]} />
                      <Text style={[styles.bodyText, styles.rowText]}>
                        {item}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </Animated.View>
        )}
      </View>

      <View style={styles.footer}>
        {closing === 'error' ? (
          <>
            <View style={styles.closeError}>
              <Text style={styles.closeErrorText}>
                Couldn't finish closing the interview. Try again, or leave
                anyway.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={onDone}
              style={({ pressed }) => [
                styles.button,
                styles.primary,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.primaryLabel}>Try again</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onLeaveAnyway}
              style={({ pressed }) => [
                styles.button,
                styles.secondary,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.secondaryLabel}>Leave anyway</Text>
            </Pressable>
          </>
        ) : (
          <>
            {status === 'error' && (
              <Pressable
                accessibilityRole="button"
                disabled={closing === 'loading'}
                onPress={runAnalysis}
                style={({ pressed }) => [
                  styles.button,
                  styles.primary,
                  closing === 'loading' && styles.busy,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.primaryLabel}>Try again</Text>
              </Pressable>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{
                disabled: status === 'loading' || closing === 'loading',
                busy: closing === 'loading',
              }}
              disabled={status === 'loading' || closing === 'loading'}
              onPress={onDone}
              style={({ pressed }) => [
                styles.button,
                status === 'error' ? styles.secondary : styles.primary,
                status === 'loading' && styles.disabled,
                closing === 'loading' && styles.busy,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={
                  status === 'error'
                    ? styles.secondaryLabel
                    : styles.primaryLabel
                }
              >
                {closing === 'loading' ? 'Closing…' : 'Done'}
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const stylesFactory = themedStylesFactory(t =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.bg,
    },
    flex: {
      flex: 1,
    },
    body: {
      flex: 1,
    },

    // Loading + error
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    pulseWrap: {
      width: 64,
      height: 64,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 32,
    },
    pulseRing: {
      position: 'absolute',
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: t.gold,
    },
    pulseCore: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: t.gold,
    },
    errorMark: {
      width: 48,
      height: 48,
      borderRadius: 24,
      borderWidth: 2,
      borderColor: t.rose,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    errorMarkText: {
      color: t.rose,
      fontSize: 22,
      fontWeight: '700',
    },
    title: {
      fontSize: 20,
      fontWeight: '600',
      color: t.textPrimary,
      textAlign: 'center',
    },
    subtitle: {
      marginTop: 8,
      fontSize: 14,
      lineHeight: 21,
      color: t.textSecondary,
      textAlign: 'center',
    },

    // Result
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 24,
      gap: 12,
    },
    heading: {
      fontSize: 26,
      fontWeight: '700',
      letterSpacing: -0.3,
      color: t.textPrimary,
      marginBottom: 4,
    },
    card: {
      backgroundColor: t.surface1,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 16,
      padding: 16,
      gap: 10,
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: t.textPrimary,
    },
    bodyText: {
      fontSize: 14,
      lineHeight: 22,
      color: t.textSecondary,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    rowText: {
      flex: 1,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginTop: 8,
    },
    dotTeal: {
      backgroundColor: t.teal,
    },
    dotGold: {
      backgroundColor: t.gold,
    },

    overallRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 6,
      marginTop: 4,
    },
    overallValue: {
      fontSize: 44,
      fontWeight: '700',
      letterSpacing: -1,
      color: t.textPrimary,
    },
    overallMax: {
      fontSize: 16,
      color: t.textMuted,
    },
    barRow: {
      gap: 6,
    },
    barHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    barLabel: {
      fontSize: 13,
      color: t.textSecondary,
    },
    barValue: {
      fontSize: 13,
      fontWeight: '600',
      color: t.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    barTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: t.surface2,
      borderWidth: 1,
      borderColor: t.border,
      overflow: 'hidden',
    },
    barFill: {
      height: '100%',
      backgroundColor: t.gold,
    },

    // Footer
    footer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 12,
      gap: 8,
      borderTopWidth: 1,
      borderTopColor: t.border,
      backgroundColor: t.bg,
    },
    button: {
      height: 52,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primary: {
      backgroundColor: t.gold,
    },
    primaryLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: t.onAccent,
    },
    secondary: {
      borderWidth: 1,
      borderColor: t.borderStrong,
    },
    secondaryLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: t.textPrimary,
    },
    disabled: {
      opacity: 0.4,
    },
    busy: {
      opacity: 0.7,
    },
    closeError: {
      borderWidth: 1,
      borderColor: t.rose,
      backgroundColor: t.surface1,
      borderRadius: 12,
      padding: 12,
    },
    closeErrorText: {
      fontSize: 13,
      lineHeight: 19,
      color: t.textPrimary,
    },
    pressed: {
      opacity: 0.85,
    },
  }),
);
