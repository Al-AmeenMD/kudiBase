import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { hasPremiumEntitlement, restorePurchasesSafe } from '@/lib/revenuecat';
import { refreshPlanTier } from '@/lib/subscription';

export default function RestorePurchasesScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [restoring, setRestoring] = useState(false);

  async function handleRestore() {
    try {
      setRestoring(true);
      const info = await restorePurchasesSafe();

      if (!info) {
        Alert.alert('Restore unavailable', 'Subscription service is not configured. Please try again later.');
        return;
      }

      const isPremium = hasPremiumEntitlement(info);
      await refreshPlanTier();

      if (isPremium) {
        Alert.alert('Purchases restored', 'Your Premium subscription has been restored!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('No purchases found', 'No active Premium subscription was found for this account.');
      }
    } catch (error) {
      console.error('Restore error:', error);
      Alert.alert('Restore failed', 'Unable to restore purchases. Please try again later.');
    } finally {
      setRestoring(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top - 8, 0) }]}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backButton, { borderColor: theme.border }]}>
            <IconSymbol name="chevron.left" size={20} color={theme.primaryDeep} />
          </Pressable>
          <View style={styles.headerText}>
            <ThemedText type="subtitle">Restore purchases</ThemedText>
            <ThemedText style={[styles.caption, { color: theme.muted }]}>
              Use this if Premium is active but not showing.
            </ThemedText>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <ThemedText style={styles.sectionTitle}>How it works</ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.muted }]}>
            Restore purchases syncs your active subscription to this device. Make sure you are
            signed in with the same Apple ID or Google account used for the purchase.
          </ThemedText>
          <View style={styles.stepRow}>
            <IconSymbol name="checkmark.circle.fill" size={18} color={theme.primaryDeep} />
            <ThemedText style={styles.stepText}>Confirm the correct store account</ThemedText>
          </View>
          <View style={styles.stepRow}>
            <IconSymbol name="checkmark.circle.fill" size={18} color={theme.primaryDeep} />
            <ThemedText style={styles.stepText}>Tap restore to sync your plan</ThemedText>
          </View>
        </View>

        <Pressable
          onPress={handleRestore}
          disabled={restoring}
          style={[styles.primaryButton, { backgroundColor: theme.primary, opacity: restoring ? 0.6 : 1 }]}>
          <ThemedText style={styles.primaryButtonText}>
            {restoring ? 'Restoring...' : 'Restore purchases'}
          </ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  headerText: {
    gap: 4,
  },
  caption: { fontSize: 13 },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  bodyText: {
    fontSize: 12,
    lineHeight: 18,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepText: {
    fontSize: 12,
  },
  primaryButton: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
