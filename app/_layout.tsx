import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';

import { AppAlertHost } from '@/components/app-alert-host';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { identifyRevenueCatUser, resetRevenueCatUser } from '@/lib/revenuecat';
import { refreshPlanTier } from '@/lib/subscription';
import { configureNotifications, getPushToken } from '@/lib/notifications';
import {
  activateLocalDataForUser,
  deactivateLocalDataUser,
  getAppSetting,
  initDb,
  setAppSetting,
  upsertBusinessProfile,
} from '@/lib/db';
import { supabase } from '@/lib/supabase';

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
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          await resetRevenueCatUser();
          await deactivateLocalDataUser();
          return;
        }

        await activateLocalDataForUser(session.user.id);
        await identifyRevenueCatUser(session.user.id);
        await initDb();

        const completed = await getAppSetting('onboarding_complete');

        if (completed === 'true') {
          setCheckedOnboarding(true);
          return;
        }

        const meta = session.user.user_metadata;
        if (meta?.business_name) {
          await upsertBusinessProfile({
            businessName: meta.business_name,
            ownerName: meta.owner_name ?? '',
            phone: meta.phone ?? '',
            address: meta.address ?? '',
            email: session.user.email ?? '',
            bankName: meta.bank_name ?? '',
            accountNumber: meta.account_number ?? '',
          });
          await setAppSetting('onboarding_complete', 'true');
          setCheckedOnboarding(true);
          return;
        }
      } catch (err) {
        console.error('Startup error:', err);
      } finally {
        setCheckedOnboarding(true);
      }
    }

    checkOnboarding();
  }, [checkedOnboarding, error, loaded, router, segments]);

  useEffect(() => {
    const hasSegments = (segments as string[]).length > 0;
    if (checkedOnboarding && !hasSegments) {
      async function checkRedirect() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          router.replace('/onboarding');
          return;
        }
        await activateLocalDataForUser(session.user.id);
        await identifyRevenueCatUser(session.user.id);
        const completed = await getAppSetting('onboarding_complete');
        if (completed !== 'true') {
          router.replace('/onboarding');
        }
      }
      checkRedirect();
    }
  }, [checkedOnboarding, router, segments]);

  useEffect(() => {
    async function checkAndRegister() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          await identifyRevenueCatUser(session.user.id);
          const token = await getPushToken();
          
          if (token) {
            const { error } = await supabase.from('push_tokens').upsert({
              user_id: session.user.id,
              token: token,
            }, { onConflict: 'user_id,token' });
            
            if (error) console.error('Push token registration failed:', error.message);
          }
        }
      } catch (err) {
        console.error('Push token error:', err);
      }
    }

    checkAndRegister();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        checkAndRegister();
        if (session?.user) {
          identifyRevenueCatUser(session.user.id).catch(() => {});
        }
      }
      if (event === 'SIGNED_OUT') {
        resetRevenueCatUser().catch(() => {});
      }
    });

    return () => subscription.unsubscribe();
  }, [checkedOnboarding]);

  if ((!loaded && !error) || !checkedOnboarding) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal', headerShown: true, animation: 'fade' }} />
        <Stack.Screen name="receipt" />
        <Stack.Screen name="receipts" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="reminder" />
        <Stack.Screen name="backup" />
        <Stack.Screen name="oauthredirect" />
        <Stack.Screen name="record-payment" />
        <Stack.Screen name="inventory-item" />
        <Stack.Screen name="stock-adjust" />
        <Stack.Screen name="privacy" />
        <Stack.Screen name="help" />
        <Stack.Screen name="sales-records" />
        <Stack.Screen name="premium" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="restore" />
        <Stack.Screen name="manage-subscription" />
      </Stack>
      <AppAlertHost />
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
