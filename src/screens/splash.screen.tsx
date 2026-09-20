import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { RootStackParamsList } from '@/navigation/navigation.types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { themedStylesFactory } from '@/utils';
import { useThemedStyles } from '@/contexts';

// Shortest time the splash stays up, so it never just flashes.
const MIN_DURATION = 1200;

// A five-bar voice waveform. `lo`/`hi` are the scaleY range each bar breathes
// between; the centre bar is tallest and durations differ so it never looks
// mechanical.
const BARS = [
  { lo: 0.3, hi: 0.55, duration: 700 },
  { lo: 0.55, hi: 0.95, duration: 620 },
  { lo: 0.7, hi: 1, duration: 800 },
  { lo: 0.45, hi: 0.8, duration: 680 },
  { lo: 0.25, hi: 0.5, duration: 760 },
];

const Bar: React.FC<{
  index: number;
  lo: number;
  hi: number;
  duration: number;
  style: object;
}> = ({ index, lo, hi, duration, style }) => {
  const grow = useRef(new Animated.Value(0)).current;
  const wave = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const intro = Animated.timing(grow, {
      toValue: 1,
      duration: 500,
      delay: index * 90,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(wave, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(wave, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    intro.start();
    breathe.start();
    return () => {
      intro.stop();
      breathe.stop();
    };
  }, []);

  const scaleY = Animated.multiply(
    grow,
    wave.interpolate({ inputRange: [0, 1], outputRange: [lo, hi] }),
  );

  return <Animated.View style={[style, { transform: [{ scaleY }] }]} />;
};

export const SplashScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamsList>>();
  const styles = useThemedStyles(stylesFactory);

  const [ready, setReady] = useState(false);
  const content = useRef(new Animated.Value(1)).current; // exit fade
  const title = useRef(new Animated.Value(0)).current; // wordmark entrance
  const [minElapsed, setMinElapsed] = useState(false);
  const finished = useRef(false);

  // Startup work goes here (read saved settings, check the model download...).
  // The splash stays up until this flips `ready` to true.
  useEffect(() => {
    setReady(true);
  }, []);

  // A splash shouldn't be dismissable.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const intro = Animated.sequence([
      Animated.delay(550),
      Animated.timing(title, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    intro.start();
    const timer = setTimeout(() => setMinElapsed(true), MIN_DURATION);

    return () => {
      intro.stop();
      clearTimeout(timer);
    };
  }, []);

  // Leave only when the minimum time has passed AND the app says it's ready.
  useEffect(() => {
    if (!minElapsed || !ready || finished.current) return;
    finished.current = true;
    Animated.timing(content, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => navigation.replace('ModelsDownload'));
  }, [minElapsed, ready, navigation, content]);

  const titleStyle = {
    opacity: title,
    transform: [
      {
        translateY: title.interpolate({
          inputRange: [0, 1],
          outputRange: [10, 0],
        }),
      },
    ],
  };

  return (
    // The background stays solid while only the content fades, so no window
    // colour shows through during the transition.
    <View style={styles.container} accessibilityLabel="Imprace">
      <Animated.View style={[styles.content, { opacity: content }]}>
        <View style={styles.bars}>
          {BARS.map((bar, i) => (
            <Bar key={i} index={i} style={styles.bar} {...bar} />
          ))}
        </View>

        <Animated.View style={[styles.textBlock, titleStyle]}>
          <Text style={styles.wordmark}>
            Impr<Text style={styles.wordmarkAccent}>ace</Text>
          </Text>
          <Text style={styles.tagline}>Practice interviews out loud.</Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

const stylesFactory = themedStylesFactory(t =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.bg,
    },
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bars: {
      height: 72,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    bar: {
      width: 8,
      height: 72,
      borderRadius: 4,
      backgroundColor: t.gold,
    },
    textBlock: {
      marginTop: 36,
      alignItems: 'center',
    },
    wordmark: {
      fontSize: 34,
      fontWeight: '700',
      letterSpacing: -0.8,
      color: t.textPrimary,
    },
    wordmarkAccent: {
      color: t.gold,
    },
    tagline: {
      marginTop: 8,
      fontSize: 14,
      letterSpacing: 0.2,
      color: t.textSecondary,
    },
  }),
);

/* ---------------------------------------------------------------------------
 * Usage: register it as the first route in your stack.
 *
 * <Stack.Screen
 *   name="Splash"
 *   component={SplashScreen}
 *   options={{ headerShown: false, animation: 'fade' }}
 * />
 *
 * and add `Splash: undefined;` to RootStackParamsList.
 * ------------------------------------------------------------------------- */
