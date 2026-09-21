import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Button, Icon, ProgressBar } from 'react-native-paper';
import {
  NavigationProp,
  StackActions,
  useNavigation,
} from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RootStackParamsList } from '@/navigation/navigation.types';
import { useTheme, useThemedStyles } from '@/contexts';
import { formatBytes, themedStylesFactory } from '@/utils';
import { useGetModelsState, useNotificationsPermission } from '@/hooks';

import { NitroDownloadManager, NitroFilesAPI } from 'react-native-akki-ai';
import type { DownloadState } from 'react-native-akki-ai/lib/specs/DownloadManager.nitro';
import { ModelDownloadRow, ConfirmationModal, ConsentLine } from '@/components';
import { AsyncStorage, NotificationAskedKey } from '@/constants';

type Props = NativeStackScreenProps<RootStackParamsList, 'ModelsDownload'>;

export const ModelsDownloadScreen: React.FC<Props> = () => {
  const [
    showNotificationsPermissionModel,
    setShowNotificationsPermissionModel,
  ] = useState(false);
  const [rawStates, setRawStates] = useState<DownloadState[]>([]);

  const {
    isFetching,
    error,
    modelStates: initialStates,
    fetchStates,
  } = useGetModelsState();

  const navigation = useNavigation<NavigationProp<RootStackParamsList>>();

  const theme = useTheme();
  const styles = useThemedStyles(stylesFactory);

  const { requestNotificationsPermission, shouldShowConsentModal } =
    useNotificationsPermission();

  useEffect(() => {
    NitroFilesAPI.copyStarterFiles();
    if (initialStates) {
      setRawStates(initialStates);
    }
  }, [initialStates]);

  const updateModelsStates = useCallback((downloadState: DownloadState) => {
    setRawStates(prev => {
      const exists = prev.some(s => s.id === downloadState.id);
      if (!exists) return [...prev, downloadState];
      return prev.map(s => (s.id === downloadState.id ? downloadState : s));
    });
  }, []);

  useEffect(() => {
    const unsubscribe = NitroDownloadManager.addDownloadListener(
      downloadState => {
        updateModelsStates(downloadState);
      },
    );
    return unsubscribe;
  }, [updateModelsStates]);

  const { missing, isDownloading, allReady, pendingBytes, overallProgress } =
    useMemo(() => {
      const miss = rawStates.filter(m => m.status !== 'done');
      const downloading = rawStates.some(
        m =>
          m.status === 'downloading' ||
          m.status === 'queued' ||
          m.status === 'verifying',
      );
      const ready =
        rawStates.length > 0 && rawStates.every(m => m.status === 'done');

      const pending = miss.reduce(
        (s, m) => s + Math.max(m.totalBytes - m.bytesDownloaded, 0),
        0,
      );

      const active = rawStates.filter(m => m.status !== 'done');
      const activeBytes = active.reduce(
        (s, m) => s + Math.max(m.totalBytes, 0),
        0,
      );
      const doneBytes = active.reduce((s, m) => s + m.bytesDownloaded, 0);

      return {
        missing: miss,
        isDownloading: downloading,
        allReady: ready,
        pendingBytes: pending,
        overallProgress: activeBytes ? doneBytes / activeBytes : 0,
      };
    }, [rawStates]);

  const loadingRef = useRef(false);

  const downloadModel = (id: string) => {
    NitroDownloadManager.startDownload(id).catch(() => {});
  };

  const pauseDownload = (id: string) => {
    NitroDownloadManager.pauseDownload(id).catch(() => {});
  };

  const downloadMissing = (items: DownloadState[]) => {
    items.forEach(m => downloadModel(m.id));
  };

  const handleContinue = () => {
    navigation.dispatch(StackActions.replace('InterviewStarter'));
  };

  const downloadWithPermission = async () => {
    if (Platform.OS === 'ios') {
      downloadMissing(missing);
      return;
    }
    if (loadingRef.current) return;
    loadingRef.current = true;

    const shouldShowModal = await shouldShowConsentModal();

    if (shouldShowModal) {
      await AsyncStorage.setItem(NotificationAskedKey, 'asked');
      setShowNotificationsPermissionModel(true);
    } else {
      downloadMissing(missing);
    }

    loadingRef.current = false;
  };

  if (isFetching) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={theme.gold} />
        <Text style={styles.checkingText}>Checking installed models…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.root, styles.center]}>
        <Icon source="alert-circle-outline" size={28} color={theme.rose} />
        <Text style={styles.checkingText}>
          Couldn't check installed models. Please try again.
        </Text>
        <Button
          mode="contained"
          icon="refresh"
          buttonColor={theme.gold}
          textColor={theme.onInverse}
          onPress={fetchStates}
          style={styles.cta}
          labelStyle={styles.ctaLabel}
        >
          Retry
        </Button>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Icon
              source="download-circle-outline"
              size={30}
              color={theme.gold}
            />
          </View>
          <Text style={styles.title}>Set up on-device models</Text>
          <Text style={styles.subtitle}>
            Imprace runs entirely on your phone. These models power the
            interview — nothing you say ever leaves your device.
          </Text>
        </View>

        <View style={styles.list}>
          {rawStates.map((m, i) => (
            <ModelDownloadRow
              key={m.id}
              i={i}
              modelState={m}
              downloadModel={downloadModel}
              pauseDownload={pauseDownload}
            />
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {allReady && (
          <Button
            mode="contained"
            icon="check"
            buttonColor={theme.teal}
            textColor={theme.onInverse}
            style={styles.cta}
            labelStyle={styles.ctaLabel}
            onPress={handleContinue}
          >
            You're all set — Continue
          </Button>
        )}
        {isDownloading && (
          <>
            <View style={styles.footerMetaRow}>
              <Text style={styles.footerMeta}>Downloading models…</Text>
              <Text style={styles.footerMetaStrong}>
                {Math.round(overallProgress * 100)}%
              </Text>
            </View>
            <ProgressBar
              progress={overallProgress}
              color={theme.gold}
              style={styles.footerProgress}
            />
          </>
        )}
        {!isDownloading && !allReady && (
          <>
            <Text style={styles.footerNote}>
              {pendingBytes > 0
                ? `${formatBytes(pendingBytes)} will be downloaded`
                : 'Ready to download'}
              {missing.length < rawStates.length
                ? ` · ${rawStates.length - missing.length} already on device`
                : ''}
            </Text>
            <Button
              mode="contained"
              icon="download"
              buttonColor={theme.gold}
              textColor={theme.onInverse}
              style={styles.cta}
              labelStyle={styles.ctaLabel}
              onPress={() => downloadWithPermission()}
            >
              {pendingBytes > 0
                ? `Download (${formatBytes(pendingBytes)})`
                : 'Download'}
            </Button>
          </>
        )}
        <ConsentLine />
      </View>
      <ConfirmationModal
        visible={showNotificationsPermissionModel}
        title="Allow notifications"
        description="Model downloads run in the background. Turn on notifications to see download progress and know when your models are ready."
        icon="download"
        onConfirm={async () => {
          await requestNotificationsPermission();
          setShowNotificationsPermissionModel(false);
          downloadMissing(missing);
        }}
        onDismiss={() => {
          setShowNotificationsPermissionModel(false);
          downloadMissing(missing);
        }}
      />
    </SafeAreaView>
  );
};

/**
 *
 * requestNotifications(['alert', 'sound', 'badge']);
 */

const stylesFactory = themedStylesFactory(t =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: t.bg,
    },
    center: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    checkingText: {
      fontSize: 13,
      color: t.textSecondary,
    },
    scroll: {
      padding: 20,
      paddingTop: 32,
    },
    header: {
      alignItems: 'center',
      marginBottom: 28,
    },
    headerIcon: {
      width: 64,
      height: 64,
      borderRadius: 20,
      backgroundColor: t.noticeBg,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 22,
      fontWeight: '700',
      color: t.textPrimary,
      textAlign: 'center',
    },
    subtitle: {
      marginTop: 8,
      fontSize: 14,
      lineHeight: 20,
      color: t.textSecondary,
      textAlign: 'center',
      paddingHorizontal: 8,
    },
    list: {
      gap: 12,
    },
    footer: {
      padding: 20,
      paddingTop: 10,
      paddingBottom: 0,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.border,
      backgroundColor: t.bg,
    },
    footerNote: {
      fontSize: 13,
      color: t.textSecondary,
      textAlign: 'center',
      marginBottom: 12,
    },
    footerMetaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    footerMeta: {
      fontSize: 13,
      color: t.textSecondary,
    },
    footerMetaStrong: {
      fontSize: 13,
      fontWeight: '700',
      color: t.textPrimary,
    },
    footerProgress: {
      height: 6,
      borderRadius: 3,
      backgroundColor: t.surface2,
    },
    cta: {
      borderRadius: 24,
    },
    ctaLabel: {
      fontSize: 15,
      fontWeight: '600',
      paddingVertical: 4,
    },
  }),
);

export default ModelsDownloadScreen;
