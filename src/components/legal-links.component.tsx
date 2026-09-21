// LegalLinks.tsx
import { useMemo } from 'react';
import { Linking, Text, View, StyleSheet } from 'react-native';

import { Palette, WEB_LINK_BASE } from '@/constants';
import { useTheme } from '@/contexts';

const open = (path: string) => Linking.openURL(`${WEB_LINK_BASE}/${path}`);

export function LegalFooter() {
  const p = useTheme();
  const s = useMemo(() => makeStyles(p), [p]);
  return (
    <View style={s.row}>
      <Text style={s.link} onPress={() => open('privacy-policy.html')}>
        Privacy
      </Text>
      <Text style={s.dot}>·</Text>
      <Text style={s.link} onPress={() => open('terms-of-service.html')}>
        Terms
      </Text>
      <Text style={s.dot}>·</Text>
      <Text style={s.link} onPress={() => open('support.html')}>
        Support
      </Text>
    </View>
  );
}

// First-run consent line for ModelsDownload
export function ConsentLine() {
  const p = useTheme();
  const s = useMemo(() => makeStyles(p), [p]);
  return (
    <Text style={s.consent}>
      By downloading and using Imprace, you agree to our{' '}
      <Text style={s.link} onPress={() => open('terms-of-service.html')}>
        Terms
      </Text>{' '}
      and{' '}
      <Text style={s.link} onPress={() => open('privacy-policy.html')}>
        Privacy Policy
      </Text>
      .
    </Text>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 16,
    },
    consent: {
      textAlign: 'center',
      color: p.textSecondary,
      fontSize: 12,
      lineHeight: 18,
      paddingHorizontal: 24,
      paddingVertical: 12,
    },
    link: {
      color: p.teal,
      fontSize: 12,
      textDecorationLine: 'underline',
    },
    dot: {
      color: p.textMuted,
      fontSize: 12,
    },
  });
