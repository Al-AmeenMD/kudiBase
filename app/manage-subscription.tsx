import { useRouter } from 'expo-router';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { presentCustomerCenter } from '@/lib/revenuecat';

export default function ManageSubscriptionScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const router = useRouter();
  const insets = useSafeAreaInsets();

  async function handleOpenStore() {
    // Try RevenueCat Customer Center first
    try {
      await presentCustomerCenter();
      return;
    } catch {
      // Fall back to store links
    }

    // Open native subscription management
    if (Platform.OS === 'ios') {
      Linking.openURL('https://apps.apple.com/account/subscriptions');
    } else {
      Linking.openURL('https://play.google.com/store/account/subscriptions');
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
            <ThemedText type="subtitle">Manage subscription</ThemedText>
            <ThemedText style={[styles.caption, { color: theme.muted }]}>
              Update payment method or cancel your plan.
            </ThemedText>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <ThemedText style={styles.sectionTitle}>Where to manage</ThemedText>
          <View style={styles.infoRow}>
            <IconSymbol name="apple.logo" size={18} color={theme.primaryDeep} />
            <ThemedText style={styles.infoText}>iOS: App Store → Subscriptions</ThemedText>
          </View>
          <View style={styles.infoRow}>
            <IconSymbol name="play.fill" size={18} color={theme.primaryDeep} />
            <ThemedText style={styles.infoText}>Android: Play Store → Payments & subscriptions</ThemedText>
          </View>
        </View>

        <Pressable onPress={handleOpenStore} style={[styles.primaryButton, { backgroundColor: theme.primary }]}>
          <ThemedText style={styles.primaryButtonText}>Open subscription settings</ThemedText>
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
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
