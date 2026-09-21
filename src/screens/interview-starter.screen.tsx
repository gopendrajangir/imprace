import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Pressable,
  Alert,
} from 'react-native';
import React, { useState } from 'react';
import {
  TextInput,
  Text,
  Button,
  Icon,
  ActivityIndicator,
} from 'react-native-paper';
import {
  pick,
  keepLocalCopy,
  types as DocTypes,
  isErrorWithCode,
  errorCodes,
} from '@react-native-documents/picker';

import { useTheme, useThemedStyles } from '@/contexts';
import { themedStylesFactory, extractPdfText } from '@/utils';
import { RootStackParamsList } from '@/navigation/navigation.types';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { LegalFooter } from '@/components';

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
  const [jobDescription, setJobDescription] = useState('');

  // Resume (PDF) — parsed text is just stored for now, not used yet.
  const [resumeName, setResumeName] = useState<string | null>(null);
  const [resumeText, setResumeText] = useState('');
  const [isParsingResume, setIsParsingResume] = useState(false);

  // Every field is optional; only block starting while a resume is parsing.
  const canStart = !isParsingResume;

  const navigation = useNavigation<NavigationProp<RootStackParamsList>>();

  const pickResume = async () => {
    try {
      const [res] = await pick({
        type: [DocTypes.pdf],
        allowMultiSelection: false,
      });

      // The fork returns a content:// uri; make a real file:// copy so the
      // native PDF parser can open it.
      let path = res.uri;
      try {
        const [copy] = await keepLocalCopy({
          files: [{ uri: res.uri, fileName: res.name ?? 'resume.pdf' }],
          destination: 'cachesDirectory',
        });
        if (copy.status === 'success') path = copy.localUri;
      } catch {
        // fall back to res.uri if the local copy fails
      }

      setResumeName(res.name ?? 'resume.pdf');
      setResumeText('');
      setIsParsingResume(true);

      try {
        const text = await extractPdfText(path);
        setResumeText(text);
      } catch (e: any) {
        setResumeName(null);
        setResumeText('');
        Alert.alert(
          'Could not read PDF',
          e?.message ?? 'Failed to parse the selected resume.',
        );
      } finally {
        setIsParsingResume(false);
      }
    } catch (err) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) {
        return; // user cancelled -> do nothing
      }
      Alert.alert('Error', 'Could not open the file picker.');
    }
  };

  const removeResume = () => {
    if (isParsingResume) return;
    setResumeName(null);
    setResumeText('');
  };

  const handleStart = () => {
    const parts: string[] = [];
    if (name.trim()) parts.push(`Candidate name: ${name.trim()}`);
    if (role.trim())
      parts.push(`Role they're interviewing for: ${role.trim()}`);
    if (jobDescription.trim())
      parts.push(`Job description:\n${jobDescription.trim()}`);
    if (resumeText.trim())
      parts.push(`Candidate resume:\n${resumeText.trim()}`);
    parts.push(
      mode === 'ruthless'
        ? 'Be relentless — challenge every answer, ask hard follow-ups.'
        : mode === 'easy'
        ? 'Be supportive and encouraging, keep follow-ups gentle.'
        : 'Keep it realistic and fair.',
    );

    const userInfo = parts.join('\n');

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

          <Text style={styles.sectionLabel}>Resume (optional)</Text>
          <Pressable
            onPress={resumeName ? undefined : pickResume}
            disabled={isParsingResume}
            style={[styles.resumeCard, resumeName && styles.resumeCardSelected]}
          >
            {isParsingResume ? (
              <>
                <ActivityIndicator size={20} color={theme.gold} />
                <Text style={styles.resumeText} numberOfLines={1}>
                  Parsing {resumeName}…
                </Text>
              </>
            ) : resumeName ? (
              <>
                <Icon
                  source="file-check-outline"
                  size={22}
                  color={theme.gold}
                />
                <Text
                  style={[styles.resumeText, styles.resumeTextSelected]}
                  numberOfLines={1}
                >
                  {resumeName}
                </Text>
                <Pressable onPress={removeResume} hitSlop={10}>
                  <Icon source="close" size={20} color={theme.textMuted} />
                </Pressable>
              </>
            ) : (
              <>
                <Icon
                  source="file-upload-outline"
                  size={22}
                  color={theme.textMuted}
                />
                <Text style={styles.resumeText}>Upload resume (PDF)</Text>
              </>
            )}
          </Pressable>

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

          <Text style={styles.sectionLabel}>Job description (optional)</Text>
          <TextInput
            mode="outlined"
            label="Job description"
            value={jobDescription}
            onChangeText={setJobDescription}
            placeholder="Paste the job description here so questions match the role."
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
        </ScrollView>

        {/* Fixed footer: note + CTA pinned to the bottom */}
        <View style={styles.footer}>
          <Text style={styles.optionalNote}>
            All fields are optional — you can start without filling anything in.
          </Text>
          <Button
            mode="contained"
            onPress={handleStart}
            disabled={!canStart}
            loading={isParsingResume}
            buttonColor={theme.gold}
            textColor={theme.onAccent}
            style={styles.cta}
            contentStyle={styles.ctaContent}
            labelStyle={styles.ctaLabel}
          >
            {isParsingResume ? 'Parsing resume…' : 'Start interview'}
          </Button>
          <LegalFooter />
        </View>
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
    resumeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 16,
      paddingHorizontal: 14,
      borderRadius: 14,
      backgroundColor: t.surface1,
      borderWidth: 1,
      borderColor: t.border,
      marginBottom: 20,
    },
    resumeCardSelected: {
      borderColor: t.gold,
      backgroundColor: t.noticeBg,
    },
    resumeText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: t.textMuted,
    },
    resumeTextSelected: {
      color: t.textPrimary,
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
      borderWidth: 1,
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
