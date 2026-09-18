import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button, Icon } from 'react-native-paper';
import { useInterviewSetupContext } from '@/contexts';
import { useTheme, useThemedStyles } from '@/contexts';
import { themedStylesFactory } from '@/utils';

interface AIModelsLoaderProps {
  children?: React.ReactNode;
}

export const AIModelsLoader = ({ children }: AIModelsLoaderProps) => {
  const { loadModels, loadError, loadState } = useInterviewSetupContext();
  const theme = useTheme();
  const styles = useThemedStyles(stylesFactory);

  if (loadState === 'loaded') {
    return <>{children}</>;
  }

  if (loadState === 'failed') {
    return (
      <View style={styles.center}>
        <Icon source="alert-circle-outline" size={40} color={theme.rose} />
        <Text style={styles.errorText}>
          {loadError ?? 'Something went wrong loading the AI models.'}
        </Text>
        <Button
          mode="contained"
          buttonColor={theme.gold}
          textColor={theme.onAccent}
          onPress={() => loadModels()}
        >
          Retry
        </Button>
      </View>
    );
  }

  if (loadState === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.gold} />
        <Text style={styles.subtle}>Loading AI models…</Text>
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <Icon source="robot-happy-outline" size={44} color={theme.gold} />
      <Text style={styles.idleTitle}>Preparing your interview space</Text>
      <Text style={styles.subtle}>Just a moment…</Text>
    </View>
  );
};

const stylesFactory = themedStylesFactory(t =>
  StyleSheet.create({
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      gap: 12,
      backgroundColor: t.bg,
    },
    subtle: { color: t.textSecondary, fontSize: 13, textAlign: 'center' },
    idleTitle: {
      color: t.textPrimary,
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
    errorText: {
      color: t.rose,
      fontSize: 15,
      fontWeight: '600',
      textAlign: 'center',
    },
  }),
);
