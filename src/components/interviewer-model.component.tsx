import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import {
  FilamentScene,
  FilamentView,
  DefaultLight,
  ModelRenderer,
  Camera,
} from 'react-native-filament';
import { ISharedValue, useSharedValue } from 'react-native-worklets-core';

import { buildVisemeTimeline, type VisemeCue } from './visemes';
import { useInterviewerModel } from '@/hooks';
import { InterviewBackground } from '@/assets';

interface InterviewerModelProps {
  phonemes?: string[] | null;
  durationFrames?: number[] | null;
  soundDuration?: number | null;
  isPlaying: boolean;
  isPaused: boolean;
  micLevelSV: ISharedValue<number>;
}

const Scene = ({
  timelineSV,
  isPlayingSV,
  isPausedSV,
  micLevelSV,
}: {
  timelineSV: ISharedValue<VisemeCue[]>;
  isPlayingSV: ISharedValue<boolean>;
  isPausedSV: ISharedValue<boolean>;
  micLevelSV: ISharedValue<number>;
}) => {
  const { model, renderCallback } = useInterviewerModel({
    isPlayingSV,
    isPausedSV,
    timelineSV,
    micLevelSV,
  });

  return (
    <FilamentView style={styles.filament} renderCallback={renderCallback}>
      <DefaultLight />
      <ModelRenderer model={model} transformToUnitCube />
      <Camera cameraPosition={[0, 1, 0.9]} cameraTarget={[0, 0.8, 0]} />
    </FilamentView>
  );
};

export const InterviewerModel = React.memo(
  ({
    phonemes,
    durationFrames,
    soundDuration,
    isPlaying,
    isPaused,
    micLevelSV,
  }: InterviewerModelProps) => {
    const timelineSV = useSharedValue<VisemeCue[]>([]);
    const isPlayingSV = useSharedValue(false);
    const isPausedSV = useSharedValue(false);

    const builtTimeline = useMemo(() => {
      if (!phonemes || !durationFrames || !soundDuration) return [];
      return buildVisemeTimeline(phonemes, durationFrames, soundDuration);
    }, [phonemes, durationFrames, soundDuration]);

    useEffect(() => {
      timelineSV.value = builtTimeline;
    }, [builtTimeline, timelineSV]);

    useEffect(() => {
      isPlayingSV.value = isPlaying;
      isPausedSV.value = isPaused;
    }, [isPlaying, isPlayingSV, isPaused, isPausedSV]);

    return (
      <View style={styles.container}>
        <Image
          source={InterviewBackground}
          style={styles.backgroundImage}
          resizeMode="cover"
        />
        <FilamentScene>
          <Scene
            micLevelSV={micLevelSV}
            timelineSV={timelineSV}
            isPlayingSV={isPlayingSV}
            isPausedSV={isPausedSV}
          />
        </FilamentScene>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundImage: { height: '100%', width: '100%', position: 'absolute' },
  filament: { flex: 1, width: '100%' },
});
