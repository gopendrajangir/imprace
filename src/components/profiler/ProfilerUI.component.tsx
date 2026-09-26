// Shared building blocks for all profiler tabs (LLM, KittenTTS, Whisper).
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Button } from 'react-native-paper';
import { useTheme, useThemedStyles } from '@/contexts';
import { readableOn, themedStylesFactory } from '@/utils';
import type { ProfileResult } from 'react-native-akki-ai/lib/specs/LocalLLM.nitro';

export const formatMs = (ms: number) =>
  ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${ms.toFixed(0)} ms`;

const mb = (v: number) => `${v.toFixed(0)} MB`;

export const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : String(e);

export type Metric = { label: string; value: string; detail?: string };

export function profileMetrics(r: ProfileResult): Metric[] {
  const metrics: Metric[] = [{ label: 'Time', value: formatMs(r.timeMs) }];
  // iOS has no Gfx dev (GPU memory is part of the app footprint there).
  if (Platform.OS === 'android') {
    metrics.push({ label: 'Gfx dev', value: mb(r.gfxDevMB) });
  }
  return metrics;
}

export const MetricGrid: React.FC<{ metrics: Metric[] }> = ({ metrics }) => {
  const styles = useThemedStyles(stylesFactory);
  return (
    <View style={styles.grid}>
      {metrics.map(m => (
        <View key={m.label} style={styles.cell}>
          <Text style={styles.cellLabel}>{m.label}</Text>
          <Text style={styles.cellValue}>{m.value}</Text>
          {m.detail ? <Text style={styles.cellDetail}>{m.detail}</Text> : null}
        </View>
      ))}
    </View>
  );
};

export const Card: React.FC<{
  title: string;
  description?: string;
  children?: React.ReactNode;
}> = ({ title, description, children }) => {
  const styles = useThemedStyles(stylesFactory);
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {description ? (
        <Text style={styles.cardDescription}>{description}</Text>
      ) : null}
      {children}
    </View>
  );
};

export const ActionButton: React.FC<{
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}> = ({ label, onPress, busy, disabled, variant = 'primary' }) => {
  const theme = useTheme();
  const styles = useThemedStyles(stylesFactory);
  const primary = variant === 'primary';

  return (
    <Button
      mode={primary ? 'contained' : 'outlined'}
      onPress={onPress}
      loading={busy}
      disabled={disabled || busy}
      buttonColor={primary ? theme.teal : undefined}
      textColor={primary ? readableOn(theme.teal, theme) : theme.teal}
      style={[styles.button, !primary && styles.buttonOutlined]}
      labelStyle={styles.buttonLabel}
    >
      {label}
    </Button>
  );
};

export const ErrorText: React.FC<{ message: string | null }> = ({
  message,
}) => {
  const styles = useThemedStyles(stylesFactory);
  return message ? <Text style={styles.error}>{message}</Text> : null;
};

const stylesFactory = themedStylesFactory(t =>
  StyleSheet.create({
    card: {
      backgroundColor: t.surface1,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.border,
      padding: 14,
      gap: 10,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: t.textPrimary,
    },
    cardDescription: {
      fontSize: 13,
      color: t.textSecondary,
      marginTop: -4,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      rowGap: 10,
    },
    cell: {
      width: '50%',
      paddingRight: 8,
    },
    cellLabel: {
      fontSize: 12,
      color: t.textSecondary,
    },
    cellValue: {
      fontSize: 16,
      fontWeight: '600',
      color: t.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    cellDetail: {
      fontSize: 11,
      color: t.textMuted,
      fontVariant: ['tabular-nums'],
    },
    button: {
      borderRadius: 8,
    },
    buttonOutlined: {
      borderColor: t.teal,
    },
    buttonLabel: {
      fontSize: 14,
    },
    error: {
      fontSize: 13,
      color: t.rose,
    },
  }),
);
