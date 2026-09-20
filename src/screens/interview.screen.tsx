import React, { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamsList } from '@/navigation/navigation.types';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  NavigationProp,
  StackActions,
  useNavigation,
} from '@react-navigation/native';
import { openSettings } from 'react-native-permissions';

import {
  UserCamera,
  InterviewerControlsOverlay,
  InterviewerModel,
  InterviewerVisualizer,
  UserControlsOverlay,
  ConfirmationModal,
} from '@/components';
import { themedStylesFactory } from '@/utils';
import { useInterviewFlow, usePermissions } from '@/hooks';
import { useInterviewSetupContext, useThemedStyles } from '@/contexts';

type Props = NativeStackScreenProps<RootStackParamsList, 'Interview'>;

export const InterviewScreen: React.FC<Props> = ({ route }) => {
  const [checkingPermission, setCheckingPermission] = useState(true);
  const [showEndModal, setShowEndModal] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [showCaption, setShowCaption] = useState(true);
  const [showModel, setShowModel] = useState(true); // avatar vs. visualizer
  const [ending, setEnding] = useState(false);
  const [stopped, setStopped] = useState(false);

  const {
    candidateInfo: { userInfo, systemPrompt, overwriteSystemPrompt },
  } = route.params;

  const navigation = useNavigation<NavigationProp<RootStackParamsList>>();

  const { loadState } = useInterviewSetupContext();

  const styles = useThemedStyles(stylesFactory);

  const {
    interviewStartStatus,
    soundPlayError,
    synthesizeError,
    llmError,
    transcribeError,

    isPlaying,
    playingIndex,
    soundProgress,
    kittenResult,
    soundDuration,
    micLevelSV,
    isRecordingIdle,
    isManualRecording,
    recordingStatus,
    isInterviewerSpeaking,
    transcribedText,
    transcribeStatus,

    startInterview,
    setIsManualRecording,
    startRecording,
    stopRecording,
  } = useInterviewFlow(stopped);

  const { requestPermissions, checkPermissions, statuses } = usePermissions([
    'mic',
    'camera',
  ]);

  const micGranted = statuses['mic'] === 'granted';

  useEffect(() => {
    setCheckingPermission(true);
    checkPermissions().finally(() => {
      setCheckingPermission(false);
    });
  }, [checkPermissions]);

  useEffect(() => {
    if (
      loadState === 'loaded' &&
      interviewStartStatus === 'idle' &&
      micGranted
    ) {
      startInterview(userInfo, systemPrompt, overwriteSystemPrompt);
    }
  }, [loadState, micGranted, interviewStartStatus, userInfo]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  const onEndInterview = async () => {
    setEnding(true);
    setStopped(true);
    setShowEndModal(false);

    setTimeout(() => {
      navigation.dispatch(StackActions.replace('InterviewAnalysis'));
    }, 500);
  };

  const spokenText = (() => {
    if (kittenResult.length === 0 || playingIndex >= kittenResult.length)
      return '';

    const leftSentences = kittenResult
      .slice(0, playingIndex)
      .map(({ sentence }) => sentence)
      .join(' ');

    const currentSentence = kittenResult[playingIndex].sentence;

    const cut = Math.floor(currentSentence.length * soundProgress);
    const s = currentSentence.slice(0, cut);

    return leftSentences + (s === ' ' ? '' : ' ' + s);
  })();

  const { phonemes, durationFrames } = kittenResult[playingIndex] ?? {};

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.main}>
        <View style={styles.voiceBlob}>
          {showModel ? (
            <InterviewerModel
              phonemes={phonemes}
              durationFrames={durationFrames}
              isPlaying={isPlaying}
              soundDuration={soundDuration}
              micLevelSV={micLevelSV}
            />
          ) : (
            <InterviewerVisualizer
              active={isPlaying}
              style={StyleSheet.absoluteFill}
            />
          )}
          <InterviewerControlsOverlay
            isCaptionsEnabled={showCaption}
            onToggleCaptions={() => {
              setShowCaption(v => !v);
            }}
            isModelVisible={showModel}
            onToggleModel={() => {
              setShowModel(v => !v);
            }}
            captionText={spokenText}
            interviewStartFailed={interviewStartStatus === 'failed'}
            onRetryStartInterview={() => {
              startInterview(userInfo, systemPrompt, overwriteSystemPrompt);
            }}
            soundPlayError={soundPlayError}
            synthesizeError={synthesizeError}
            llmError={llmError}
            stopped={stopped}
            style={styles.controlsOverlay}
          />
        </View>
        <View style={styles.userContent}>
          <UserCamera enabled={isCameraOn} />
          <UserControlsOverlay
            isRecordingIdle={isRecordingIdle}
            micLevelSV={micLevelSV}
            style={styles.controlsOverlay}
            isManualMode={isManualRecording}
            isUserSpeaking={recordingStatus === 'recording'}
            isInterviewerSpeaking={isInterviewerSpeaking}
            onEndSpeech={stopRecording}
            onManualModeChange={value => {
              setIsManualRecording(value);
            }}
            onEndInterview={() => {
              setShowEndModal(true);
            }}
            onStartRecording={startRecording}
            isCameraOn={isCameraOn}
            onCameraToggle={value => {
              setIsCameraOn(value);
            }}
            transcriptionText={transcribedText}
            transcribeError={transcribeError}
            transcribing={transcribeStatus === 'transcribing'}
          />
        </View>
      </View>
      <ConfirmationModal
        visible={!micGranted && !checkingPermission}
        title="Camera & Microphone Access"
        description="We use your camera and mic to run a live simulated interview and give you feedback on your responses."
        icon="camera"
        onConfirm={() => {
          if (statuses['mic'] === 'blocked') {
            openSettings();
          } else {
            requestPermissions();
          }
        }}
      />
      <ConfirmationModal
        visible={showEndModal}
        title="End interview?"
        description="Are you sure you want to end the interview?"
        icon="stop-circle-outline"
        confirmLabel="End interview"
        cancelLabel="Keep going"
        disabled={ending}
        loading={ending}
        onConfirm={onEndInterview}
        onDismiss={() => setShowEndModal(false)}
      />
    </SafeAreaView>
  );
};

const stylesFactory = themedStylesFactory(t =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.bg,
    },
    main: {
      flex: 1,
    },
    voiceBlob: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    aiName: {
      position: 'absolute',
      fontSize: 14,
      color: t.textPrimary,
    },
    aiResponse: {
      position: 'absolute',
      fontSize: 12,
      lineHeight: 18,
      textAlign: 'center',
      color: t.textPrimary,
      top: 'auto',
      bottom: 0,
      padding: 2,
      paddingHorizontal: 4,
      backgroundColor: t.bg,
      borderRadius: 4,
      margin: 4,
    },
    userContent: {
      flex: 1,
      borderTopWidth: 1,
      borderColor: t.border,
    },
    debug: {
      position: 'absolute',
      top: 8,
      left: 8,
      right: 8,
      backgroundColor: 'rgba(0,0,0,0.6)',
      padding: 6,
      borderRadius: 6,
    },
    debugText: {
      color: '#9AE6B4',
      fontSize: 10,
      fontVariant: ['tabular-nums'],
    },
    controlsOverlay: {
      position: 'absolute',
      height: '100%',
      width: '100%',
    },
  }),
);
