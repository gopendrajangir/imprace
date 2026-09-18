import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import React, { useState } from 'react';
import { TextInput, Text, Button, Icon } from 'react-native-paper';

import { useTheme, useThemedStyles } from '@/contexts';
import { themedStylesFactory } from '@/utils';
import { RootStackParamsList } from '@/navigation/navigation.types';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationProp, useNavigation } from '@react-navigation/native';

export type Mode = 'easy' | 'balanced' | 'ruthless';

export const MODES: {
  value: Mode;
  label: string;
  hint: string;
  icon: string;
}[] = [
  {
    value: 'easy',
    label: 'Easy',
    hint: 'Supportive, gentle follow-ups, plenty of encouragement.',
    icon: 'weather-sunny',
  },
  {
    value: 'balanced',
    label: 'Balanced',
    hint: 'Realistic interview — fair questions, some probing.',
    icon: 'scale-balance',
  },
  {
    value: 'ruthless',
    label: 'Ruthless',
    hint: 'Relentless follow-ups, challenges every answer, high pressure.',
    icon: 'fire',
  },
];

type Props = NativeStackScreenProps<RootStackParamsList, 'InterviewStarter'>;

export const InterviewStarterScreen: React.FC<Props> = () => {
  const theme = useTheme();
  const styles = useThemedStyles(stylesFactory);

  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [mode, setMode] = useState<Mode>('balanced');
  const [systemPrompt, setSystemPrompt] = useState('');

  const canStart = name.trim().length > 0 && role.trim().length > 0;

  const navigation = useNavigation<NavigationProp<RootStackParamsList>>();

  const handleStart = () => {
    const userInfo = [
      `Candidate name: ${name}`,
      `Role they're interviewing for: ${role}`,
      mode === 'ruthless'
        ? 'Be relentless — challenge every answer, ask hard follow-ups.'
        : mode === 'easy'
        ? 'Be supportive and encouraging, keep follow-ups gentle.'
        : 'Keep it realistic and fair.',
    ]
      .filter(Boolean)
      .join('\n');

    navigation.navigate('ModelsLoader', {
      candidateInfo: {
        userInfo,
        systemPrompt,
        overwriteSystemPrompt: false,
      },
    });
  };

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView style={styles.container} behavior={'padding'}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardDismissMode="none"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Set up your interview</Text>
          <Text style={styles.subtitle}>
            Tell the interviewer who you are and how tough it should be.
          </Text>

          <TextInput
            mode="outlined"
            label="Your name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Gopendra"
            style={styles.input}
            returnKeyType="next"
            textColor={theme.textPrimary}
            outlineColor={theme.border}
            activeOutlineColor={theme.gold}
            theme={{
              colors: {
                onSurfaceVariant: theme.textSecondary,
                background: theme.surface1,
              },
            }}
          />

          <TextInput
            mode="outlined"
            label="Role"
            value={role}
            onChangeText={setRole}
            placeholder="e.g. Senior React Native Engineer"
            style={styles.input}
            returnKeyType="next"
            textColor={theme.textPrimary}
            outlineColor={theme.border}
            activeOutlineColor={theme.gold}
            theme={{
              colors: {
                onSurfaceVariant: theme.textSecondary,
                background: theme.surface1,
              },
            }}
          />

          <Text style={styles.sectionLabel}>Difficulty</Text>
          <View style={styles.modeRow}>
            {MODES.map(m => {
              const selected = m.value === mode;
              return (
                <View
                  key={m.value}
                  style={[styles.modeCard, selected && styles.modeCardSelected]}
                  onTouchEnd={() => setMode(m.value)}
                >
                  <Icon
                    source={m.icon}
                    size={22}
                    color={selected ? theme.gold : theme.textMuted}
                  />
                  <Text
                    style={[
                      styles.modeLabel,
                      selected && styles.modeLabelSelected,
                    ]}
                  >
                    {m.label}
                  </Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.modeHint}>
            {MODES.find(m => m.value === mode)?.hint}
          </Text>

          <Text style={styles.sectionLabel}>
            Custom instructions (optional)
          </Text>
          <TextInput
            mode="outlined"
            label="System prompt"
            value={systemPrompt}
            onChangeText={setSystemPrompt}
            placeholder="e.g. Focus on system design and native module architecture."
            multiline
            numberOfLines={4}
            style={[styles.input, styles.multiline]}
            textColor={theme.textPrimary}
            outlineColor={theme.border}
            activeOutlineColor={theme.gold}
            theme={{
              colors: {
                onSurfaceVariant: theme.textSecondary,
                background: theme.surface1,
              },
            }}
          />

          <Button
            mode="contained"
            onPress={handleStart}
            disabled={!canStart}
            buttonColor={theme.gold}
            textColor={theme.onAccent}
            style={styles.cta}
            contentStyle={styles.ctaContent}
            labelStyle={styles.ctaLabel}
          >
            Start interview
          </Button>
        </ScrollView>
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
    scroll: {
      padding: 20,
      paddingBottom: 40,
    },
    title: {
      fontSize: 22,
      fontWeight: '700',
      color: t.textPrimary,
      marginTop: 8,
    },
    subtitle: {
      fontSize: 14,
      lineHeight: 20,
      color: t.textSecondary,
      marginBottom: 24,
      marginTop: 4,
    },
    input: {
      marginBottom: 16,
      backgroundColor: t.surface1,
    },
    multiline: {
      minHeight: 100,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: t.textSecondary,
      marginBottom: 10,
      marginTop: 4,
    },
    modeRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 10,
    },
    modeCard: {
      flex: 1,
      alignItems: 'center',
      gap: 6,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: t.surface1,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.border,
    },
    modeCardSelected: {
      borderColor: t.gold,
      backgroundColor: t.noticeBg,
    },
    modeLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: t.textMuted,
    },
    modeLabelSelected: {
      color: t.textPrimary,
    },
    modeHint: {
      fontSize: 12,
      color: t.textMuted,
      minHeight: 32,
      marginBottom: 20,
    },
    cta: {
      marginTop: 12,
      borderRadius: 24,
    },
    ctaContent: {
      paddingVertical: 6,
    },
    ctaLabel: {
      fontSize: 15,
      fontWeight: '600',
    },
  }),
);
