import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { useRouter, useSegments } from 'expo-router';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { refreshPlanTier } from '@/lib/subscription';
import { configureNotifications } from '@/lib/notifications';
import { getAppSetting, initDb } from '@/lib/db';

export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const [checkedOnboarding, setCheckedOnboarding] = useState(false);
  const [loaded, error] = useFonts({
    'Sora-Regular': require('@/assets/fonts/Sora-Regular.ttf'),
    'Sora-SemiBold': require('@/assets/fonts/Sora-SemiBold.ttf'),
    'Sora-Bold': require('@/assets/fonts/Sora-Bold.ttf'),
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loaded, error]);

  useEffect(() => {
    configureNotifications();
  }, []);

  useEffect(() => {
    refreshPlanTier().catch(() => {});
  }, []);

  useEffect(() => {
    if (!loaded && !error) {
      return;
    }
    if (checkedOnboarding) {
      return;
    }
    const isOnboarding = segments[0] === 'onboarding';
    if (isOnboarding) {
      return;
    }
    async function checkOnboarding() {
      await initDb();
      const completed = await getAppSetting('onboarding_complete');
      if (completed !== 'true') {
        router.replace('/onboarding');
      }
      setCheckedOnboarding(true);
    }
    checkOnboarding().catch(() => {});
  }, [checkedOnboarding, error, loaded, router, segments]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal', headerShown: true }} />
        <Stack.Screen name="receipt" />
        <Stack.Screen name="receipts" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="reminder" />
        <Stack.Screen name="backup" />
        <Stack.Screen name="record-payment" />
        <Stack.Screen name="inventory-item" />
        <Stack.Screen name="stock-adjust" />
        <Stack.Screen name="privacy" />
        <Stack.Screen name="help" />
        <Stack.Screen name="sales-records" />
        <Stack.Screen name="premium" />
        <Stack.Screen name="restore" />
        <Stack.Screen name="manage-subscription" />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
