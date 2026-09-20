import { useTheme, useThemedStyles } from '@/contexts';
import { readableOn, themedStylesFactory } from '@/utils';
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, Text } from 'react-native';
import { IconButton, Button } from 'react-native-paper';
import BottomAnchoredScrollView from './bottom-anchored-scrollview.component';

interface InterviewerControlsOverlayProps {
  isCaptionsEnabled: boolean;
  captionText?: string | null;
  interviewStartFailed: boolean;
  soundPlayError: string | null;
  synthesizeError: string | null;
  llmError: string | null;
  stopped?: boolean;
  isModelVisible: boolean;

  onToggleModel: () => void;
  onRetryStartInterview: () => void;
  onToggleCaptions: () => void;

  style?: StyleProp<ViewStyle>;
}

const TOAST_DURATION_MS = 5000;

export const InterviewerControlsOverlay = ({
  isCaptionsEnabled,
  captionText,
  interviewStartFailed,
  soundPlayError,
  synthesizeError,
  llmError,
  stopped,
  isModelVisible,
  onToggleModel,

  onRetryStartInterview,
  onToggleCaptions,
  style,
}: InterviewerControlsOverlayProps) => {
  const styles = useThemedStyles(stylesFactory);
  const showCaption = isCaptionsEnabled && !!captionText;

  const theme = useTheme();

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Track previous values so we can detect which error most recently changed.
  const prevErrors = useRef<{
    soundPlayError: string | null;
    synthesizeError: string | null;
    llmError: string | null;
  }>({ soundPlayError: null, synthesizeError: null, llmError: null });

  useEffect(() => {
    const prev = prevErrors.current;
    const changed: string[] = [];

    // Order here defines priority when several change in the same render:
    // the last pushed wins, so llmError is treated as "latest".
    if (soundPlayError && soundPlayError !== prev.soundPlayError) {
      changed.push(soundPlayError);
    }
    if (synthesizeError && synthesizeError !== prev.synthesizeError) {
      changed.push(synthesizeError);
    }
    if (llmError && llmError !== prev.llmError) {
      changed.push(llmError);
    }

    prevErrors.current = { soundPlayError, synthesizeError, llmError };

    if (changed.length > 0) {
      setToastMessage(changed[changed.length - 1]);
    }
  }, [soundPlayError, synthesizeError, llmError]);

  // Auto-dismiss the toast 5s after the latest message appears.
  // Re-running on message change resets the timer for each new error.
  useEffect(() => {
    if (!toastMessage) return;
    const id = setTimeout(() => setToastMessage(null), TOAST_DURATION_MS);
    return () => clearTimeout(id);
  }, [toastMessage]);

  const modelToggleTimeRef = useRef(Date.now());

  const onToggleModelCallback = () => {
    if(modelToggleTimeRef.current - Date.now() >= 2000){
      modelToggleTimeRef.current = Date.now()
      onToggleModel();
    }
  }

  return (
    <View style={[styles.container, style]} pointerEvents="box-none">
      <View style={styles.btnsContainer}>
        <IconButton
          icon={isCaptionsEnabled ? 'closed-caption' : 'closed-caption-outline'}
          iconColor={theme.textPrimary}
          containerColor={theme.surface2}
          size={22}
          onPress={onToggleCaptions}
        />
        <IconButton
          icon={isModelVisible ? 'cube-outline' : 'waveform'}
          onPress={onToggleModelCallback}
          iconColor={theme.textPrimary}
          containerColor={theme.surface2}
          size={22}
        />
      </View>

      {toastMessage && !stopped && (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText} numberOfLines={3}>
            {toastMessage}
          </Text>
        </View>
      )}

      {interviewStartFailed && (
        <View style={styles.centerError} pointerEvents="box-none">
          <Text style={styles.centerErrorText}>
            Couldn't start the interview.
          </Text>
          <Button
            mode="contained"
            onPress={onRetryStartInterview}
            style={styles.retryButton}
          >
            Retry
          </Button>
        </View>
      )}

      {showCaption && (
        <BottomAnchoredScrollView
          style={styles.captionBox}
          contentStyle={styles.captionContent}
          textStyle={styles.captionText}
          text={captionText}
        />
      )}
    </View>
  );
};

const stylesFactory = themedStylesFactory(t =>
  StyleSheet.create({
    container: {
      flex: 1,
      width: '100%',
      height: '100%',
    },
    btnsContainer: {
      position: 'absolute',
      top: 8,
      right: 8,
      margin: 0,
    },
    toast: {
      position: 'absolute',
      top: 8,
      left: 16,
      right: 16,
      backgroundColor: t.rose,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      alignItems: 'center',
      zIndex: 10,
      elevation: 4,
    },
    toastText: {
      color: readableOn(t.rose, t),
      fontSize: 13,
      lineHeight: 18,
      textAlign: 'center',
    },
    centerError: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    centerErrorText: {
      color: t.textPrimary,
      fontSize: 15,
      textAlign: 'center',
      marginBottom: 12,
    },
    retryButton: {
      alignSelf: 'center',
    },
    captionBox: {
      position: 'absolute',
      bottom: 16,
      left: 24,
      right: 24,
      maxHeight: 100,
    },
    captionContent: {
      alignItems: 'center',
    },
    captionText: {
      backgroundColor: t.captionBg,
      color: t.textPrimary,
      fontSize: 12,
      lineHeight: 16,
      paddingHorizontal: 4,
      paddingVertical: 4,
      borderRadius: 4,
      textAlign: 'center',
      overflow: 'hidden',
    },
  }),
);
