import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Avatar } from 'react-native-paper';

import { useTheme, useThemedStyles } from '@/contexts';
import { themedStylesFactory } from '@/utils';

interface Props {
  /** True while the AI interviewer is speaking. */
  active?: boolean;
  style?: StyleProp<ViewStyle>;
}

const NODE_COUNT = 6;
const BAR_COUNT = 11;

const ORBIT_MS = 9000;
const PULSE_MS = 1800;

const HALO = 220;
const ORBIT = 188;
const AVATAR_SIZE = 126;
const INNER_SIZE = 110;

export const InterviewerVisualizer: React.FC<Props> = ({
  active = false,
  style,
}) => {
  const theme = useTheme();
  const styles = useThemedStyles(stylesFactory);

  const pulse = useRef(new Animated.Value(0)).current;
  const orbit = useRef(new Animated.Value(0)).current;

  const bars = useMemo(
    () => Array.from({ length: BAR_COUNT }, () => new Animated.Value(0)),
    [],
  );

  useEffect(() => {
    // -----------------------------
    // Core pulse animation
    // -----------------------------
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: PULSE_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: PULSE_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    // -----------------------------
    // Orbit rotation
    // -----------------------------
    const orbitLoop = Animated.loop(
      Animated.timing(orbit, {
        toValue: 1,
        duration: ORBIT_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    pulseLoop.start();
    orbitLoop.start();

    // -----------------------------
    // Waveform animation
    // -----------------------------
    const barLoops = bars.map((bar, index) => {
      const duration = active ? 180 + index * 15 : 650;

      const loop = Animated.loop(
        Animated.sequence([
          Animated.delay(index * 65),

          Animated.timing(bar, {
            toValue: 1,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),

          Animated.timing(bar, {
            toValue: 0,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );

      loop.start();

      return loop;
    });

    return () => {
      pulseLoop.stop();
      orbitLoop.stop();

      barLoops.forEach(loop => {
        loop.stop();
      });
    };
  }, [active, bars, orbit, pulse]);

  const accent = active ? theme.gold : theme.teal;

  // -----------------------------
  // Pulse scales
  // -----------------------------
  const coreScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: active ? [1, 1.05] : [1, 1.02],
  });

  const glowScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: active ? [1, 1.18] : [1, 1.08],
  });

  // -----------------------------
  // Orbit rotation
  // -----------------------------
  const orbitRotation = orbit.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.container, style]} pointerEvents="none">
      {/* --------------------------------
          TOP WAVEFORM
         -------------------------------- */}
      <View style={styles.waveform}>
        {bars.map((bar, index) => {
          const scaleY = bar.interpolate({
            inputRange: [0, 1],
            outputRange: active ? [0.25, 1] : [0.35, 0.55],
          });

          const opacity = bar.interpolate({
            inputRange: [0, 1],
            outputRange: active ? [0.45, 1] : [0.2, 0.35],
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.waveBar,
                {
                  backgroundColor: accent,
                  opacity,
                  transform: [{ scaleY }],
                },
              ]}
            />
          );
        })}
      </View>

      {/* --------------------------------
          CENTER VISUALIZER
         -------------------------------- */}
      <View style={styles.visualizer}>
        {/* Outer halo */}
        <Animated.View
          style={[
            styles.halo,
            {
              borderColor: accent,
              opacity: active ? 0.15 : 0.07,
              transform: [{ scale: glowScale }],
            },
          ]}
        />

        {/* Main rotating orbit */}
        <Animated.View
          style={[
            styles.orbit,
            {
              transform: [{ rotate: orbitRotation }],
            },
          ]}
        >
          {Array.from({ length: NODE_COUNT }).map((_, index) => {
            const angle = (360 / NODE_COUNT) * index;

            return (
              <View
                key={index}
                style={[
                  styles.node,
                  {
                    backgroundColor: accent,
                    transform: [
                      {
                        rotate: `${angle}deg`,
                      },
                      {
                        translateY: -94,
                      },
                    ],
                  },
                ]}
              />
            );
          })}
        </Animated.View>

        {/* Secondary dashed orbit */}
        <Animated.View
          style={[
            styles.secondaryOrbit,
            {
              borderColor: accent,
              opacity: active ? 0.28 : 0.12,
              transform: [{ rotate: orbitRotation }],
            },
          ]}
        />

        {/* --------------------------------
            AVATAR
           -------------------------------- */}
        <Animated.View
          style={[
            styles.avatarShell,
            {
              borderColor: accent,
              shadowColor: accent,
              transform: [{ scale: coreScale }],
            },
          ]}
        >
          <View
            style={[
              styles.avatarInner,
              {
                backgroundColor: theme.surface2,
              },
            ]}
          >
            <Avatar.Icon
              size={72}
              icon="account-tie-outline"
              color={accent}
              style={styles.avatarIcon}
            />

            {/* Status dot */}
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: accent,
                  shadowColor: accent,
                },
              ]}
            />
          </View>
        </Animated.View>
      </View>
    </View>
  );
};

const stylesFactory = themedStylesFactory(t =>
  StyleSheet.create({
    // --------------------------------
    // MAIN CONTAINER
    // --------------------------------
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',

      // IMPORTANT:
      // Do NOT add paddingTop here.
      // It would move the avatar away from
      // the center of the absolute circles.
    },

    // --------------------------------
    // WAVEFORM
    // --------------------------------
    waveform: {
      position: 'absolute',
      top: 22,

      height: 28,

      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',

      gap: 4,
    },

    waveBar: {
      width: 3,
      height: 24,
      borderRadius: 2,
    },

    // --------------------------------
    // CENTER VISUALIZER
    //
    // Everything inside this view is
    // centered relative to the same point.
    // --------------------------------
    visualizer: {
      width: HALO,
      height: HALO,

      alignItems: 'center',
      justifyContent: 'center',

      position: 'relative',
    },

    // --------------------------------
    // OUTER HALO
    // --------------------------------
    halo: {
      position: 'absolute',

      width: HALO,
      height: HALO,

      borderRadius: HALO / 2,
      borderWidth: 1,
    },

    // --------------------------------
    // MAIN ORBIT
    // --------------------------------
    orbit: {
      position: 'absolute',

      width: ORBIT,
      height: ORBIT,

      alignItems: 'center',
      justifyContent: 'center',
    },

    // --------------------------------
    // ORBIT NODES
    // --------------------------------
    node: {
      position: 'absolute',

      width: 6,
      height: 6,

      borderRadius: 3,

      opacity: 0.75,

      shadowOpacity: 0.7,
      shadowRadius: 7,
    },

    // --------------------------------
    // SECONDARY ORBIT
    // --------------------------------
    secondaryOrbit: {
      position: 'absolute',

      width: 166,
      height: 166,

      borderRadius: 83,

      borderWidth: 1,
      borderStyle: 'dashed',
    },

    // --------------------------------
    // AVATAR OUTER CIRCLE
    // --------------------------------
    avatarShell: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,

      borderRadius: AVATAR_SIZE / 2,

      borderWidth: 1.5,

      alignItems: 'center',
      justifyContent: 'center',

      shadowOpacity: 0.3,
      shadowRadius: 20,

      shadowOffset: {
        width: 0,
        height: 0,
      },

      elevation: 10,
    },

    // --------------------------------
    // AVATAR INNER CIRCLE
    // --------------------------------
    avatarInner: {
      width: INNER_SIZE,
      height: INNER_SIZE,

      borderRadius: INNER_SIZE / 2,

      alignItems: 'center',
      justifyContent: 'center',

      overflow: 'hidden',
    },

    avatarIcon: {
      backgroundColor: 'transparent',
    },

    // --------------------------------
    // STATUS DOT
    // --------------------------------
    statusDot: {
      position: 'absolute',

      bottom: 12,

      width: 6,
      height: 6,

      borderRadius: 3,

      shadowOpacity: 0.9,
      shadowRadius: 5,
    },
  }),
);
