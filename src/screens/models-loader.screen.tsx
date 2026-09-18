import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button, Icon } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  useInterviewSetupContext,
  useTheme,
  useThemedStyles,
} from '@/contexts';
import { themedStylesFactory } from '@/utils';
import { RootStackParamsList } from '@/navigation/navigation.types';
import {
  NavigationProp,
  StackActions,
  useNavigation,
} from '@react-navigation/native';

type Props = NativeStackScreenProps<RootStackParamsList, 'ModelsLoader'>;

export const ModelsLoaderScreen: React.FC<Props> = ({ route }) => {
  const { loadModels, loadError, loadState } = useInterviewSetupContext();

  const { candidateInfo } = route.params;

  const theme = useTheme();
  const styles = useThemedStyles(stylesFactory);

  const navigation = useNavigation<NavigationProp<RootStackParamsList>>();

  useEffect(() => {
    loadModels();
  }, []);

  useEffect(() => {
    if (loadState === 'loaded') {
      navigation.dispatch(StackActions.replace('Interview', { candidateInfo }));
    }
  }, [loadState, candidateInfo]);

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
