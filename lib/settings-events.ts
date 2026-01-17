type SettingsListener = (key: string, value: string) => void;

const listeners = new Set<SettingsListener>();

export function subscribeSettings(listener: SettingsListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitSettingChange(key: string, value: string) {
  listeners.forEach((listener) => {
    try {
      listener(key, value);
    } catch {
      // Ignore listener errors to keep updates flowing.
    }
  });
}
