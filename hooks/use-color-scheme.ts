import { useColorScheme as useSystemColorScheme } from 'react-native';
import { useEffect, useState } from 'react';

import { getAppSetting, initDb } from '@/lib/db';
import { subscribeSettings } from '@/lib/settings-events';

export function useColorScheme() {
  const system = useSystemColorScheme();
  const [preference, setPreference] = useState<'system' | 'light' | 'dark'>('system');

  useEffect(() => {
    let isMounted = true;
    async function load() {
      await initDb();
      const value = await getAppSetting('theme_mode');
      if (!isMounted) {
        return;
      }
      if (value === 'light' || value === 'dark' || value === 'system') {
        setPreference(value);
      }
    }
    load().catch(() => {});
    const unsubscribe = subscribeSettings((key, value) => {
      if (!isMounted || key !== 'theme_mode') {
        return;
      }
      if (value === 'light' || value === 'dark' || value === 'system') {
        setPreference(value);
      }
    });
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  if (preference === 'system') {
    return system;
  }
  return preference;
}
