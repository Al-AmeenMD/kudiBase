import { useEffect, useRef, useState } from 'react';
import { Alert, type AlertButton } from 'react-native';

import { ConfirmDialog } from '@/components/confirm-dialog';

type AppAlertState = {
  title: string;
  message: string;
  buttons?: AlertButton[];
};

function getVariant(title: string): 'default' | 'destructive' | 'success' {
  const normalized = title.toLowerCase();
  if (
    normalized.includes('saved') ||
    normalized.includes('complete') ||
    normalized.includes('success') ||
    normalized.includes('restored') ||
    normalized.includes('exported')
  ) {
    return 'success';
  }
  if (
    normalized.includes('failed') ||
    normalized.includes('error') ||
    normalized.includes('invalid') ||
    normalized.includes('required') ||
    normalized.includes('unavailable') ||
    normalized.includes('limit')
  ) {
    return 'destructive';
  }
  return 'default';
}

function getPrimaryButton(buttons?: AlertButton[]) {
  if (!buttons?.length) {
    return undefined;
  }
  return buttons.find((button) => button.style !== 'cancel') ?? buttons[buttons.length - 1];
}

function getCancelButton(buttons?: AlertButton[]) {
  return buttons?.find((button) => button.style === 'cancel');
}

export function AppAlertHost() {
  const [alertState, setAlertState] = useState<AppAlertState | null>(null);
  const originalAlert = useRef(Alert.alert);

  useEffect(() => {
    Alert.alert = (title, message, buttons) => {
      setAlertState({
        title: String(title ?? ''),
        message: String(message ?? ''),
        buttons,
      });
    };

    return () => {
      Alert.alert = originalAlert.current;
    };
  }, []);

  const primaryButton = getPrimaryButton(alertState?.buttons);
  const cancelButton = getCancelButton(alertState?.buttons);
  const showCancel = Boolean(cancelButton && primaryButton && primaryButton !== cancelButton);

  function closeWith(button?: AlertButton) {
    setAlertState(null);
    button?.onPress?.();
  }

  return (
    <ConfirmDialog
      visible={alertState !== null}
      title={alertState?.title ?? ''}
      message={alertState?.message ?? ''}
      confirmLabel={primaryButton?.text ?? 'OK'}
      cancelLabel={cancelButton?.text ?? 'Cancel'}
      iconName={getVariant(alertState?.title ?? '') === 'success' ? 'checkmark.circle.fill' : 'questionmark.circle.fill'}
      variant={getVariant(alertState?.title ?? '')}
      showCancel={showCancel}
      onCancel={() => closeWith(cancelButton)}
      onConfirm={() => closeWith(primaryButton)}
    />
  );
}
