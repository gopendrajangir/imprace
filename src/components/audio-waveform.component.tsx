import { useThemedStyles } from '@/contexts';
import { themedStylesFactory } from '@/utils';
import type { ISharedValue } from 'react-native-worklets-core';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, StyleSheet, ViewStyle } from 'react-native';

interface AudioWaveformProps {
  /** Live mic level, 0–1, updated on the worklet thread. */
  micLevelSV: ISharedValue<number>;
  /** Whether to show the wave (e.g. bind to isUserSpeaking). */
  isActive: boolean;

  style?: StyleProp<ViewStyle>;
}

const MIN_HALF_HEIGHT = 3; // px, at rest
const MAX_HALF_HEIGHT = 20; // px, at full level

// Per-bar amplitude/frequency/phase so bars don't move in lockstep off one scalar.
const BAR_CONFIG = [
  { amp: 0.55, freq: 5.5, phase: 0.0 },
  { amp: 0.8, freq: 7.0, phase: 1.1 },
  { amp: 1.0, freq: 8.5, phase: 2.3 },
  { amp: 0.8, freq: 6.5, phase: 3.4 },
  { amp: 0.55, freq: 7.8, phase: 4.2 },
];

export const AudioWaveform = ({
  micLevelSV,
  isActive,
  style,
}: AudioWaveformProps) => {
  const styles = useThemedStyles(stylesFactory);

  const barHeights = useRef(
    BAR_CONFIG.map(() => new Animated.Value(MIN_HALF_HEIGHT * 2)),
  ).current;
  const opacity = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const frameRef = useRef<number>(0);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: isActive ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isActive, opacity]);

  useEffect(() => {
    const tick = () => {
      const level = Math.max(0, Math.min(1, micLevelSV.value ?? 0));
      const t = (Date.now() - startTimeRef.current) / 1000;

      BAR_CONFIG.forEach((cfg, i) => {
        const wobble = 0.6 + 0.4 * Math.sin(t * cfg.freq + cfg.phase);
        const half =
          MIN_HALF_HEIGHT +
          level * cfg.amp * wobble * (MAX_HALF_HEIGHT - MIN_HALF_HEIGHT);
        barHeights[i].setValue(half * 2); // full height, centered => grows up+down equally
      });

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [micLevelSV, barHeights]);

  return (
    <Animated.View
      style={[styles.container, { opacity }, style]}
      pointerEvents="none"
    >
      {barHeights.map((h, i) => (
        <Animated.View key={i} style={[styles.bar, { height: h }]} />
      ))}
    </Animated.View>
  );
};

const stylesFactory = themedStylesFactory(() =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center', // centers each bar vertically => grows both up and down
      justifyContent: 'center',
      gap: 4,
      height: MAX_HALF_HEIGHT * 2,
    },
    bar: {
      width: 4,
      borderRadius: 2,
      backgroundColor: '#222',
    },
  }),
);
