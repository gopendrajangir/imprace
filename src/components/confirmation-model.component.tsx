import { useTheme, useThemedStyles } from '@/contexts';
import { themedStylesFactory } from '@/utils';
import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Modal, Portal, Button, Icon } from 'react-native-paper';

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  description: string;
  icon?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onDismiss?: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export const ConfirmationModal = ({
  visible,
  title,
  description,
  icon = 'shield-check-outline',
  confirmLabel = 'Continue',
  cancelLabel = 'Not now',
  onConfirm,
  onDismiss,
  disabled = false, // ← default
  loading = false,
}: ConfirmationModalProps) => {
  const styles = useThemedStyles(stylesFactory);
  const theme = useTheme();

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={disabled ? undefined : onDismiss} // ← block dismiss while disabled
        dismissable={!!onDismiss && !disabled} // ← and block tap-outside
        contentContainerStyle={styles.container}
      >
        <View style={styles.iconWrap}>
          <Icon source={icon} size={32} color={theme.teal} />
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>

        <Button
          mode="contained"
          onPress={onConfirm}
          disabled={disabled} // ← gate confirm
          loading={loading} // ← optional spinner
          buttonColor={theme.teal}
          textColor={theme.onAccent}
          style={styles.confirmButton}
          labelStyle={styles.confirmButtonLabel}
        >
          {confirmLabel}
        </Button>

        {onDismiss && (
          <Button
            mode="text"
            onPress={onDismiss}
            disabled={disabled} // ← gate cancel too
            textColor={theme.textSecondary}
            style={styles.cancelButton}
            labelStyle={styles.cancelButtonLabel}
          >
            {cancelLabel}
          </Button>
        )}
      </Modal>
    </Portal>
  );
};

const stylesFactory = themedStylesFactory(t =>
  StyleSheet.create({
    container: {
      backgroundColor: t.surface2,
      marginHorizontal: 24,
      borderRadius: 20,
      padding: 24,
      alignItems: 'center',
    },
    iconWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: t.surface1,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 17,
      fontWeight: '600',
      color: t.textPrimary,
      textAlign: 'center',
      marginBottom: 8,
    },
    description: {
      fontSize: 14,
      color: t.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 20,
    },
    confirmButton: {
      width: '100%',
      borderRadius: 20,
      marginVertical: 0,
    },
    confirmButtonLabel: {
      fontSize: 14,
      fontWeight: '600',
    },
    cancelButton: {
      marginTop: 8,
    },
    cancelButtonLabel: {
      fontSize: 14,
      fontWeight: '600',
    },
  }),
);
