import { View, StyleSheet, ScrollView } from 'react-native';
import React, { useState } from 'react';
import { TextInput, Text, Button } from 'react-native-paper';

import { useTheme, useThemedStyles } from '@/contexts';
import { themedStylesFactory } from '@/utils';
import { LegalFooter } from '@/components';
import { CandidateInfo } from '@/navigation/navigation.types';

interface CustomInterviewFormProps {
  onStart: (info: CandidateInfo) => void;
}

export const CustomInterviewForm: React.FC<CustomInterviewFormProps> = ({
  onStart,
}) => {
  const theme = useTheme();
  const styles = useThemedStyles(stylesFactory);

  const [systemPrompt, setSystemPrompt] = useState('');

  // A custom run is only meaningful with an actual prompt, since it replaces
  // the default interviewer behavior entirely.
  const canStart = systemPrompt.trim().length > 0;

  const handleStart = () => {
    onStart({
      userInfo: '',
      systemPrompt: systemPrompt.trim(),
      overwriteSystemPrompt: true,
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardDismissMode="none"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Custom interviewer</Text>
        <Text style={styles.subtitle}>
          Write your own instructions for the interviewer. This fully replaces
          the default behavior.
        </Text>

        <Text style={styles.sectionLabel}>System prompt</Text>
        <TextInput
          mode="outlined"
          label="System prompt"
          value={systemPrompt}
          onChangeText={setSystemPrompt}
          placeholder="e.g. You are a senior staff engineer running a tough system-design interview. Ask one question at a time, push hard on trade-offs, and keep replies short."
          multiline
          numberOfLines={10}
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
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.optionalNote}>
          Your instructions fully define how the interviewer behaves.
        </Text>
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
          Start
        </Button>
        <LegalFooter />
      </View>
    </View>
  );
};

const stylesFactory = themedStylesFactory(t =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    scroll: {
      padding: 20,
      paddingBottom: 24,
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
    sectionLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: t.textSecondary,
      marginBottom: 10,
      marginTop: 4,
    },
    input: {
      marginBottom: 16,
      backgroundColor: t.surface1,
    },
    multiline: {
      minHeight: 220,
    },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 0,
      borderTopWidth: 1,
      borderTopColor: t.border,
      backgroundColor: t.bg,
    },
    optionalNote: {
      fontSize: 12,
      color: t.textMuted,
      textAlign: 'center',
      marginBottom: 10,
    },
    cta: {
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
