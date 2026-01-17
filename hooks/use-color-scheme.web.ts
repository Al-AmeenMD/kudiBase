import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

import { getAppSetting, initDb } from '@/lib/db';
import { subscribeSettings } from '@/lib/settings-events';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);
  const [preference, setPreference] = useState<'system' | 'light' | 'dark'>('system');

  useEffect(() => {
    setHasHydrated(true);
  }, []);

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

  const colorScheme = useRNColorScheme();

  if (hasHydrated) {
    return preference === 'system' ? colorScheme : preference;
  }

  return 'light';
}
