import React, { useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';

import { useTheme } from '@/contexts';
import { usePermissions } from '@/hooks';
import { Button } from 'react-native-paper';
import { openSettings } from 'react-native-permissions';

interface Props {
  enabled: boolean;
}

export const UserCamera: React.FC<Props> = React.memo(({ enabled }) => {
  const t = useTheme();

  const device = useCameraDevice('front');

  const {
    requestPermissions,
    statuses,
    allGranted: cameraGranted,
  } = usePermissions(['camera']);

  const [appActive, setAppActive] = useState(
    AppState.currentState === 'active',
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', s =>
      setAppActive(s === 'active'),
    );
    return () => sub.remove();
  }, []);

  // Only stream the preview when it's actually visible and permitted.
  const isActive = appActive && cameraGranted;

  if (!enabled) return null;

  if (!cameraGranted) {
    return (
      <View
        style={[
          styles.container,
          styles.center,
          { backgroundColor: t.surface1 },
        ]}
      >
        <Text style={[styles.message, { color: t.textSecondary }]}>
          Camera access is needed to show your video during the interview.
        </Text>
        <Button
          mode="contained"
          icon="camera"
          buttonColor={t.gold}
          textColor={t.onInverse}
          style={styles.cta}
          labelStyle={styles.ctaLabel}
          onPress={() => {
            if (statuses['camera'] === 'blocked') {
              openSettings();
            } else {
              requestPermissions();
            }
          }}
        >
          Give Permission
        </Button>
      </View>
    );
  }

  if (device == null) {
    return (
      <View
        style={[
          styles.container,
          styles.center,
          { backgroundColor: t.surface1 },
        ]}
      >
        <Text style={[styles.message, { color: t.textMuted }]}>
          No camera available
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: t.surface1 }]}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1, // fills whatever the parent allots (your lower half)
    overflow: 'hidden',
  },
  center: { alignItems: 'center', justifyContent: 'center', padding: 20 },
  message: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  cta: {
    marginTop: 20,
    borderRadius: 24,
  },
  ctaLabel: {
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 4,
  },
});
