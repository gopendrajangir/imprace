import { View, Text, StyleSheet } from 'react-native';
import React from 'react';
import { useThemedStyles } from '@/contexts';
import { themedStylesFactory } from '@/utils';

const WhisperCppProfiler: React.FC = () => {
  const styles = useThemedStyles(stylesFactory);
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Whisper.cpp profiler</Text>
    </View>
  );
};

export default WhisperCppProfiler;

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
