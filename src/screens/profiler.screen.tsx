import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import React, { useState } from 'react';
import { RootStackParamsList } from '@/navigation/navigation.types';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useThemedStyles } from '@/contexts';
import { themedStylesFactory } from '@/utils';

import KittenTTSProfiler from '@/components/profiler/KittenTTSProfiler.component';
import LLMProfiler from '@/components/profiler/LLMProfiler.component';
import WhisperCppProfiler from '@/components/profiler/WhisperCppProfiler.component';
import WhisperLiteRTProfiler from '@/components/profiler/WhisperLiteRTProfiler.component';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = NativeStackScreenProps<RootStackParamsList, 'Profiler'>;

type TabKey = 'llm' | 'kittenTTS' | 'whisperCpp' | 'whisperLiteRT';

const TABS: { key: TabKey; label: string; androidOnly?: boolean }[] = [
  { key: 'llm', label: 'LLM' },
  { key: 'kittenTTS', label: 'KittenTTS' },
  { key: 'whisperCpp', label: 'Whisper.cpp' },
  { key: 'whisperLiteRT', label: 'WhisperLiteRT', androidOnly: true },
];

const visibleTabs = TABS.filter(
  t => !t.androidOnly || Platform.OS === 'android',
);

const ProfilerScreen: React.FC<Props> = () => {
  const styles = useThemedStyles(stylesFactory);
  const [active, setActive] = useState<TabKey>('llm');

  const renderTab = () => {
    switch (active) {
      case 'llm':
        return <LLMProfiler />;
      case 'kittenTTS':
        return <KittenTTSProfiler />;
      case 'whisperCpp':
        return <WhisperCppProfiler />;
      case 'whisperLiteRT':
        return <WhisperLiteRTProfiler />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabBar}>
        {visibleTabs.map(tab => {
          const selected = tab.key === active;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActive(tab.key)}
              style={[styles.tab, selected && styles.tabSelected]}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
            >
              <Text
                style={[styles.tabText, selected && styles.tabTextSelected]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.content}>{renderTab()}</View>
    </SafeAreaView>
  );
};

export default ProfilerScreen;

const stylesFactory = themedStylesFactory(t =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.bg,
    },
    tabBar: {
      flexDirection: 'row',
      backgroundColor: t.surface1,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.border,
    },
    tab: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabSelected: {
      borderBottomColor: t.gold,
    },
    tabText: {
      fontSize: 13,
      color: t.textSecondary,
    },
    tabTextSelected: {
      color: t.textPrimary,
      fontWeight: '600',
    },
    content: {
      flex: 1,
    },
  }),
);
