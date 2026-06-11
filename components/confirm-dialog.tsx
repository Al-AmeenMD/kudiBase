import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type ConfirmDialogVariant = 'default' | 'destructive' | 'success';

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  iconName?: IconSymbolName;
  loading?: boolean;
  variant?: ConfirmDialogVariant;
  showCancel?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

const variantColors: Record<ConfirmDialogVariant, string> = {
  default: '#0F6A3D',
  destructive: '#C43D3D',
  success: '#0F6A3D',
};

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  iconName = 'questionmark.circle.fill',
  loading = false,
  variant = 'default',
  showCancel = true,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const actionColor = variantColors[variant];

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={() => {
        if (!loading) {
          onCancel();
        }
      }}>
      <Pressable style={styles.backdrop} disabled={loading} onPress={onCancel}>
        <Pressable
          style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={(event) => event.stopPropagation()}>
          <View style={[styles.iconWrap, { backgroundColor: theme.secondary }]}>
            <IconSymbol name={iconName} size={28} color={actionColor} />
          </View>
          <View style={styles.copy}>
            <ThemedText style={styles.title}>{title}</ThemedText>
            <ThemedText style={[styles.message, { color: theme.muted }]}>{message}</ThemedText>
          </View>
          <View style={styles.actions}>
            {showCancel ? (
              <Pressable
                onPress={onCancel}
                disabled={loading}
                style={[styles.button, styles.cancelButton, { borderColor: theme.border }]}>
                <ThemedText style={styles.cancelText}>{cancelLabel}</ThemedText>
              </Pressable>
            ) : null}
            <Pressable
              onPress={onConfirm}
              disabled={loading}
              style={[styles.button, { backgroundColor: actionColor }, loading ? styles.disabled : null]}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <ThemedText style={styles.confirmText}>{confirmLabel}</ThemedText>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 18,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    gap: 8,
  },
  title: {
    fontSize: 18,
  },
  message: {
    fontSize: 13,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    minHeight: 48,
    flex: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelText: {
    fontSize: 14,
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  disabled: {
    opacity: 0.6,
  },
});
