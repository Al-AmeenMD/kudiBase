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
import { configureNotifications, getPushToken } from '@/lib/notifications';
import { getAppSetting, initDb, setAppSetting, upsertBusinessProfile } from '@/lib/db';
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
      await initDb();
      const completed = await getAppSetting('onboarding_complete');

      if (completed === 'true') {
        setCheckedOnboarding(true);
        return;
      }

      // Check if there's an existing Supabase session (returning user)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const meta = session.user.user_metadata;
          if (meta?.business_name) {
            // Restore profile from Supabase metadata into local SQLite
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
        }
      } catch {
        // Session check failed, proceed to onboarding
      }

      router.replace('/onboarding');
      setCheckedOnboarding(true);
    }
    checkOnboarding().catch(() => {});
  }, [checkedOnboarding, error, loaded, router, segments]);

  useEffect(() => {
    console.log('------------------------------------');
    console.log('DEBUG: RootLayout Mounted');
    console.log('------------------------------------');

    async function checkAndRegister() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('DEBUG: Current Session User:', session?.user?.email || 'None');
        
        if (session?.user) {
          console.log('DEBUG: Fetching push token...');
          const token = await getPushToken();
          console.log('DEBUG: Push Token Result:', token);
          
          if (token) {
            console.log('DEBUG: Saving to Supabase...');
            const { error } = await supabase.from('push_tokens').upsert({
              user_id: session.user.id,
              token: token,
            }, { onConflict: 'user_id,token' });
            
            if (error) console.error('DEBUG ERROR:', error.message);
            else console.log('DEBUG: SUCCESS! Token registered.');
          }
        }
      } catch (err) {
        console.error('DEBUG CATCH ERROR:', err);
      }
    }

    checkAndRegister();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('DEBUG: Auth Event:', event);
      if (event === 'SIGNED_IN') {
        checkAndRegister();
      }
    });

    return () => subscription.unsubscribe();
  }, [checkedOnboarding]);

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
