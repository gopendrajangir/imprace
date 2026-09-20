import { View, Text, StyleSheet, Pressable } from 'react-native';
import React from 'react';
import { Icon, ProgressBar, Button } from 'react-native-paper';

import { useTheme, useThemedStyles } from '@/contexts';
import { formatBytes, themedStylesFactory } from '@/utils';
import { DownloadState } from 'react-native-akki-ai/lib/specs/DownloadManager.nitro';

interface Props {
  i: number;
  modelState: DownloadState;
  downloadModel: (id: string) => void;
  pauseDownload: (id: string) => void;
}

export const ModelDownloadRow: React.FC<Props> = ({
  i,
  modelState,
  downloadModel,
  pauseDownload,
}) => {
  const theme = useTheme();
  const styles = useThemedStyles(stylesFactory);

  const progress =
    modelState.totalBytes > 0
      ? modelState.bytesDownloaded / modelState.totalBytes
      : 0;

  const renderStatusIcon = (m: DownloadState) => {
    switch (m.status) {
      case 'done':
        return <Icon source="check-circle" size={22} color={theme.teal} />;
      case 'downloading':
        return (
          <Pressable
            onPress={() => pauseDownload(m.id)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Pause download"
          >
            <Icon source="pause-circle" size={22} color={theme.gold} />
          </Pressable>
        );
      case 'paused':
        return (
          <Pressable
            onPress={() => downloadModel(m.id)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Resume download"
          >
            <Icon source="play-circle" size={22} color={theme.gold} />
          </Pressable>
        );
      case 'queued':
      case 'verifying':
        return null;
      case 'failed':
        return <Icon source="refresh" size={22} color={theme.rose} />;
      default:
        return (
          <Icon
            source="arrow-down-circle-outline"
            size={22}
            color={theme.textMuted}
          />
        );
    }
  };

  const renderMeta = (m: DownloadState) => {
    switch (m.status) {
      case 'done':
        return <Text style={styles.metaOk}>Installed</Text>;
      case 'downloading':
        return (
          <Text style={styles.metaMuted}>
            {m.bytesDownloaded > 0
              ? `${formatBytes(m.bytesDownloaded)} / `
              : ''}
            {m.totalBytes > 0 ? `${formatBytes(m.totalBytes)} · ` : ''}
            {Math.round(progress * 100)}%
          </Text>
        );
      case 'paused':
        return (
          <Text style={styles.metaMuted}>
            Paused ·{' '}
            {m.bytesDownloaded > 0
              ? `${formatBytes(m.bytesDownloaded)} / `
              : ''}
            {m.totalBytes > 0 ? `${formatBytes(m.totalBytes)} · ` : ''}
            {Math.round(progress * 100)}%
          </Text>
        );
      case 'queued':
        return <Text style={styles.metaMuted}>Queued…</Text>;
      case 'verifying':
        return <Text style={styles.metaMuted}>Verifying…</Text>;
      case 'failed':
        return (
          <Text style={styles.metaError}>
            {m.error ?? 'Download failed'} — tap retry
          </Text>
        );
      default:
        return m.totalBytes > 0 ? (
          <Text style={styles.metaMuted}>{formatBytes(m.totalBytes)}</Text>
        ) : null;
    }
  };

  const showProgress =
    modelState.status === 'downloading' ||
    modelState.status === 'queued' ||
    modelState.status === 'verifying' ||
    modelState.status === 'paused';

  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={styles.iconTile}>
          <Icon source="cube-outline" size={22} color={theme.gold} />
        </View>

        <View style={styles.cardText}>
          <Text style={styles.cardName}>{modelState.name}</Text>
          {renderMeta(modelState)}
        </View>

        <View style={styles.cardStatus}>{renderStatusIcon(modelState)}</View>
      </View>

      {showProgress && (
        <ProgressBar
          progress={modelState.status === 'queued' ? 0 : progress}
          indeterminate={modelState.status === 'queued'}
          color={modelState.status === 'paused' ? theme.textMuted : theme.gold}
          style={styles.rowProgress}
        />
      )}

      {modelState.status === 'failed' && (
        <Button
          compact
          mode="text"
          textColor={theme.rose}
          onPress={() => downloadModel(modelState.id)}
          style={styles.retryButton}
        >
          Retry
        </Button>
      )}
    </View>
  );
};

const stylesFactory = themedStylesFactory(t =>
  StyleSheet.create({
    card: {
      backgroundColor: t.surface1,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: t.border,
      padding: 14,
    },
    cardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    iconTile: {
      width: 46,
      height: 46,
      borderRadius: 12,
      backgroundColor: t.surface2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardText: {
      flex: 1,
    },
    cardName: {
      fontSize: 15,
      fontWeight: '600',
      color: t.textPrimary,
    },
    cardSubtitle: {
      marginTop: 2,
      fontSize: 12,
      color: t.textSecondary,
    },
    metaMuted: {
      marginTop: 6,
      fontSize: 12,
      fontWeight: '600',
      color: t.textMuted,
    },
    metaOk: {
      marginTop: 6,
      fontSize: 12,
      fontWeight: '600',
      color: t.teal,
    },
    metaError: {
      marginTop: 6,
      fontSize: 12,
      fontWeight: '600',
      color: t.rose,
    },
    cardStatus: {
      width: 26,
      alignItems: 'center',
    },
    rowProgress: {
      marginTop: 12,
      height: 4,
      borderRadius: 2,
      backgroundColor: t.surface2,
    },
    retryButton: {
      alignSelf: 'flex-start',
      marginTop: 4,
      marginLeft: 46,
    },
  }),
);
