import { View, Text, StyleSheet } from 'react-native';
import React from 'react';
import { useThemedStyles } from '@/contexts';
import { themedStylesFactory } from '@/utils';

const WhisperLiteRTProfiler: React.FC = () => {
  const styles = useThemedStyles(stylesFactory);
  return (
    <View style={styles.container}>
      <Text style={styles.text}>WhisperLiteRT profiler</Text>
    </View>
  );
};

export default WhisperLiteRTProfiler;

const stylesFactory = themedStylesFactory(t =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.bg,
    },
    text: {
      fontSize: 15,
      color: t.textSecondary,
    },
  }),
);
