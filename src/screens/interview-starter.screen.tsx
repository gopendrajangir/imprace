import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Pressable,
} from 'react-native';
import React, { useState } from 'react';
import { Text } from 'react-native-paper';

import { useThemedStyles } from '@/contexts';
import { themedStylesFactory } from '@/utils';
import { RootStackParamsList } from '@/navigation/navigation.types';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { StandardInterviewForm, CustomInterviewForm } from '@/components';

// Shared payload both forms hand back to the screen for navigation.
export interface CandidateInfo {
  userInfo: string;
  systemPrompt: string;
  overwriteSystemPrompt: boolean;
}

type Tab = 'standard' | 'custom';

const TABS: { value: Tab; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'custom', label: 'Custom' },
];

type Props = NativeStackScreenProps<RootStackParamsList, 'InterviewStarter'>;

export const InterviewStarterScreen: React.FC<Props> = () => {
  const styles = useThemedStyles(stylesFactory);
  const [tab, setTab] = useState<Tab>('standard');

  const navigation = useNavigation<NavigationProp<RootStackParamsList>>();

  const handleStart = (candidateInfo: CandidateInfo) => {
    navigation.navigate('ModelsLoader', { candidateInfo });
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.tabBar}>
        {TABS.map(item => {
          const selected = item.value === tab;
          return (
            <Pressable
              key={item.value}
              style={styles.tab}
              onPress={() => setTab(item.value)}
            >
              <Text
                style={[styles.tabLabel, selected && styles.tabLabelSelected]}
              >
                {item.label}
              </Text>
              <View
                style={[
                  styles.tabUnderline,
                  selected && styles.tabUnderlineSelected,
                ]}
              />
            </Pressable>
          );
        })}
      </View>

      <KeyboardAvoidingView style={styles.container} behavior={'padding'}>
        {tab === 'standard' ? (
          <StandardInterviewForm onStart={handleStart} />
        ) : (
          <CustomInterviewForm onStart={handleStart} />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const stylesFactory = themedStylesFactory(t =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: t.bg,
    },
    container: {
      flex: 1,
    },
    tabBar: {
      flexDirection: 'row',
      backgroundColor: t.bg,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      paddingTop: 14,
    },
    tabLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: t.textSecondary,
      marginBottom: 10,
    },
    tabLabelSelected: {
      color: t.gold,
    },
    tabUnderline: {
      height: 2,
      width: '100%',
      backgroundColor: 'transparent',
    },
    tabUnderlineSelected: {
      backgroundColor: t.gold,
    },
  }),
);
