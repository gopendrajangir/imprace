import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet, StatusBar } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme, useThemedStyles } from '@/contexts';
import { themedStylesFactory } from '@/utils';
import { RootStackParamsList } from '@/navigation/navigation.types';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { palette } from '@/constants';
import {
  NavigationProp,
  StackActions,
  useNavigation,
} from '@react-navigation/native';

// adjust to your asset path
const LOGO = require('@/assets/images/logo-person.png');

const RISE = { duration: 900, easing: Easing.bezier(0.16, 1, 0.3, 1) };
const LOGO_SIZE = 128;

type Props = NativeStackScreenProps<RootStackParamsList, 'Splash'>;

export const SplashScreen: React.FC<Props> = () => {
  const theme = useTheme();
  const styles = useThemedStyles(stylesFactory);

  const enter = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    enter.value = withTiming(1, RISE);
    glow.value = withRepeat(
      withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [enter, glow]);

  const stageStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 24 }],
  }));

  const navigation = useNavigation<NavigationProp<RootStackParamsList>>();

  useEffect(() => {
    setTimeout(() => {
      navigation.dispatch(StackActions.replace('ModelsDownload'));
    }, 2000);
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={theme.bg} />

      <View style={styles.stage}>
        <View style={styles.logoWrap}>
          <Image source={LOGO} style={styles.logo} resizeMode="cover" />
        </View>

        <Animated.View style={stageStyle}>
          <Text style={styles.wordmark}>
            <Text style={styles.impr}>Impr</Text>
            <Text>ace</Text>
          </Text>

          <Text style={styles.tagline}>Improve and Ace</Text>

          <Dots color={theme.gold} />
        </Animated.View>
      </View>

      <Text style={styles.footer}>SPEAK CONFIDENTLY</Text>
    </View>
  );
};

/** Three staggered pulsing dots. */
const Dots = ({ color }: { color: string }) => (
  <View style={dotStyles.row}>
    {[0, 1, 2].map(i => (
      <Dot key={i} color={color} delay={i * 200} />
    ))}
  </View>
);

const Dot = ({ color, delay }: { color: string; delay: number }) => {
  const v = useSharedValue(0);

  useEffect(() => {
    v.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 600, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      ),
    );
  }, [delay, v]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.35 + v.value * 0.65,
    transform: [{ scale: 1 + v.value * 0.3 }],
  }));

  return (
    <Animated.View style={[dotStyles.dot, { backgroundColor: color }, style]} />
  );
};

const stylesFactory = themedStylesFactory(t =>
  StyleSheet.create({
    root: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.bg,
    },
    stage: {
      alignItems: 'center',
    },
    logoWrap: {
      width: LOGO_SIZE,
      height: LOGO_SIZE,
      marginBottom: 34,
      alignItems: 'center',
      justifyContent: 'center',
    },
    glow: {
      position: 'absolute',
      width: LOGO_SIZE * 1.9,
      height: LOGO_SIZE * 1.9,
      borderRadius: LOGO_SIZE,
      backgroundColor: t.textPrimary,
    },
    logo: {
      width: LOGO_SIZE,
      height: LOGO_SIZE,
      borderRadius: 30, // iOS squircle-ish
    },
    wordmark: {
      fontSize: 44,
      fontWeight: '800',
      letterSpacing: -0.5,
      textAlign: 'center',
      color: t.textPrimary,
    },
    impr: {
      color: t.gold,
    },
    ai: {
      fontWeight: '600',
      color: t.textSecondary,
    },
    tagline: {
      marginTop: 8,
      fontSize: 16,
      fontWeight: '500',
      letterSpacing: 0.4,
      textAlign: 'center',
      color: t.textSecondary,
    },
    footer: {
      position: 'absolute',
      bottom: 40,
      fontSize: 12,
      letterSpacing: 2,
      fontWeight: '600',
      color: t.textMuted,
    },
  }),
);

const dotStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 40,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
