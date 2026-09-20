import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, Text } from 'react-native';
import {
  IconButton,
  Button,
  Switch,
  Divider,
  Menu,
  Icon,
  ActivityIndicator,
} from 'react-native-paper';

import { useTheme, useThemedStyles } from '@/contexts';
import { readableOn, themedStylesFactory, withOpacity } from '@/utils';
import { AudioWaveform } from './audio-waveform.component';
import { ISharedValue } from 'react-native-worklets-core';
import BottomAnchoredScrollView from './bottom-anchored-scrollview.component';

interface UserControlsOverlayProps {
  isRecordingIdle: boolean;
  isManualMode: boolean;
  isUserSpeaking: boolean;
  isInterviewerSpeaking: boolean;
  micLevelSV: ISharedValue<number>;
  isCameraOn: boolean;
  transcriptionText: string | null;
  transcribeError: string | null;
  transcribing: boolean;

  onManualModeChange: (value: boolean) => void;
  onStartRecording: () => void;
  onEndSpeech: () => void;
  onEndInterview: () => void;
  onCameraToggle: (value: boolean) => void;

  style?: StyleProp<ViewStyle>;
}

const TOAST_DURATION_MS = 5000;

export const UserControlsOverlay = ({
  isRecordingIdle,
  isManualMode,
  isUserSpeaking,
  micLevelSV,
  isInterviewerSpeaking,
  isCameraOn,
  transcriptionText,
  transcribeError,
  transcribing,

  onManualModeChange,
  onStartRecording,
  onEndSpeech,
  onEndInterview,
  onCameraToggle,

  style,
}: UserControlsOverlayProps) => {
  const [isCaptionsEnabled, setIsCaptionEnabled] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const styles = useThemedStyles(stylesFactory);

  const theme = useTheme();

  const menuPressedRef = useRef(false);
  const prevTranscribeError = useRef<string | null>(null);

  const onAnchorPress = () => {
    if (!menuPressedRef.current) {
      menuPressedRef.current = true;
      setMenuVisible(true);
      setTimeout(() => {
        menuPressedRef.current = false;
      }, 1000);
    }
  };

  // Surface the toast only when transcribeError genuinely changes to a value,
  // so a re-render with the same error doesn't re-trigger after auto-dismiss.
  useEffect(() => {
    if (transcribeError && transcribeError !== prevTranscribeError.current) {
      setErrorToast(transcribeError);
    }
    prevTranscribeError.current = transcribeError;
  }, [transcribeError]);

  // Auto-dismiss 5s after the message appears; re-keys on each new message.
  useEffect(() => {
    if (!errorToast) return;
    const id = setTimeout(() => setErrorToast(null), TOAST_DURATION_MS);
    return () => clearTimeout(id);
  }, [errorToast]);

  const showAreYouThere =
    isRecordingIdle && !isManualMode && isUserSpeaking && !transcribing;

  // Error takes the top slot; while it's up, suppress the transcribing pill
  // so they don't stack at the same top offset.
  const showTranscribing = transcribing && !errorToast;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.tag} pointerEvents="none">
        <View style={styles.tagDot} />
        <Text style={styles.tagText}>You</Text>
      </View>

      {!isCameraOn && (
        <View
          style={[
            styles.cameraOffOverlay,
            { backgroundColor: withOpacity(theme.surface1, 0.95) },
          ]}
          pointerEvents="none"
        >
          <Icon source="account-circle" size={72} color={theme.textSecondary} />
        </View>
      )}

      {errorToast && (
        <View style={styles.errorToast} pointerEvents="none">
          <Icon
            source="alert-circle-outline"
            size={16}
            color={readableOn(theme.rose, theme)}
          />
          <Text style={styles.errorToastText} numberOfLines={3}>
            {errorToast}
          </Text>
        </View>
      )}

      {showTranscribing && (
        <View style={styles.transcribingToast} pointerEvents="none">
          <ActivityIndicator animating size={14} color={theme.textPrimary} />
          <Text style={styles.transcribingToastText}>Transcribing…</Text>
        </View>
      )}

      {showAreYouThere && (
        <View style={styles.toast} pointerEvents="none">
          <Icon source="information-outline" size={16} color={theme.gold} />
          <Text style={styles.toastText}>Are you there!</Text>
        </View>
      )}

      <View style={styles.bottomBar}>
        {isManualMode && !isInterviewerSpeaking && !transcribing && (
          <>
            {!isUserSpeaking ? (
              <Button
                icon="record-circle-outline"
                mode="contained"
                onPress={onStartRecording}
                buttonColor={theme.gold}
                textColor={theme.onInverse}
                style={styles.startButton}
                labelStyle={styles.startButtonLabel}
              >
                Speak
              </Button>
            ) : (
              <Button
                icon="microphone-off"
                onPress={onEndSpeech}
                buttonColor={theme.coral}
                textColor={theme.onInverse}
                style={styles.endSpeechButton}
                labelStyle={styles.endSpeechButtonLabel}
              >
                End Speech
              </Button>
            )}
          </>
        )}
        <IconButton
          icon="phone-hangup"
          iconColor={theme.onInverse}
          containerColor={theme.rose}
          size={22}
          onPress={onEndInterview}
          style={styles.icon}
        />
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchorPosition="top"
          contentStyle={styles.menuContent}
          style={styles.menu}
          anchor={
            <IconButton
              icon="dots-vertical"
              iconColor={theme.textPrimary}
              containerColor={theme.surface2}
              size={22}
              style={styles.icon}
              onPress={onAnchorPress}
            />
          }
        >
          <View style={styles.menuToggleRow}>
            <View style={styles.menuToggleLabelRow}>
              <Icon source="microphone" size={18} color={theme.textPrimary} />
              <Text style={styles.menuToggleLabel}>Speech Control</Text>
            </View>
            <Switch
              value={isManualMode}
              onValueChange={onManualModeChange}
              color={theme.teal}
            />
          </View>
          <Divider style={styles.menuDivider} />
          <View style={styles.menuToggleRow}>
            <View style={styles.menuToggleLabelRow}>
              <Icon source="camera" size={18} color={theme.textPrimary} />
              <Text style={styles.menuToggleLabel}>Camera</Text>
            </View>
            <Switch
              value={isCameraOn}
              onValueChange={onCameraToggle}
              color={theme.teal}
            />
          </View>
          <Divider style={styles.menuDivider} />
        </Menu>
      </View>

      {isUserSpeaking && !showAreYouThere && (
        <AudioWaveform
          micLevelSV={micLevelSV}
          isActive={true}
          style={styles.audioWaveform}
        />
      )}

      {isCaptionsEnabled && !!transcriptionText && !isUserSpeaking && (
        <BottomAnchoredScrollView
          style={styles.captionBox}
          contentStyle={styles.captionContent}
          textStyle={styles.captionText}
          enabled={false}
          text={transcriptionText}
        />
      )}

      <IconButton
        icon={isCaptionsEnabled ? 'subtitles' : 'subtitles-outline'}
        iconColor={theme.textPrimary}
        containerColor={theme.surface2}
        size={22}
        style={styles.captionToggle}
        onPress={() => {
          setIsCaptionEnabled(v => !v);
        }}
      />
    </View>
  );
};

const stylesFactory = themedStylesFactory(t =>
  StyleSheet.create({
    container: {
      width: '100%',
      alignItems: 'center',
      justifyContent: 'flex-end',
      padding: 8,
    },
    tag: {
      position: 'absolute',
      top: 12,
      left: 12,
      backgroundColor: t.surface2,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.border,
      zIndex: 2,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    tagDot: {
      height: 6,
      width: 6,
      borderRadius: 6,
      backgroundColor: t.gold,
    },
    tagText: {
      fontSize: 12,
      fontWeight: '600',
      color: t.textPrimary,
    },
    cameraOffOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorToast: {
      position: 'absolute',
      top: 12,
      left: 16,
      right: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: t.rose,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      zIndex: 4,
    },
    errorToastText: {
      fontSize: 12,
      fontWeight: '500',
      color: readableOn(t.rose, t),
      flexShrink: 1,
    },
    transcribingToast: {
      position: 'absolute',
      top: 12,
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: t.surface2,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: t.border,
      zIndex: 3,
    },
    transcribingToastText: {
      fontSize: 12,
      fontWeight: '500',
      color: t.textSecondary,
    },
    toast: {
      position: 'absolute',
      top: 12,
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: t.noticeBg,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
    },
    toastText: {
      fontSize: 12,
      fontWeight: '500',
      color: t.gold,
    },
    bottomBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: t.bg,
      borderRadius: 80,
      padding: 12,
    },
    startButton: {
      borderRadius: 20,
      marginVertical: 0,
    },
    startButtonLabel: {
      fontSize: 13,
      fontWeight: '600',
    },
    menuToggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    menuToggleLabel: {
      fontSize: 14,
      color: t.textPrimary,
    },
    endSpeechButton: {
      borderRadius: 20,
      marginVertical: 0,
    },
    endSpeechButtonLabel: {
      fontSize: 13,
      fontWeight: '600',
    },
    icon: {
      margin: 0,
    },
    menu: {
      paddingVertical: 70,
    },
    menuContent: {
      backgroundColor: t.surface2,
      borderRadius: 16,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: t.border,
      bottom: 0,
    },
    menuDivider: {
      backgroundColor: t.border,
    },
    menuToggleLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    audioWaveform: {
      position: 'absolute',
      top: 20,
      alignSelf: 'center',
    },
    captionToggle: {
      position: 'absolute',
      top: 8,
      right: 8,
      margin: 0,
    },
    captionBox: {
      position: 'absolute',
      bottom: 80,
      left: 24,
      right: 24,
      maxHeight: 100,
    },
    captionContent: {
      alignItems: 'center',
    },
    captionText: {
      borderRadius: 4,
      backgroundColor: t.captionBg,
      color: t.textPrimary,
      fontSize: 12,
      lineHeight: 16,
      paddingHorizontal: 4,
      paddingVertical: 4,
      textAlign: 'center',
      overflow: 'hidden',
    },
  }),
);
