import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  getAnnualPackage,
  getMonthlyPackage,
  purchasePackage,
} from '@/lib/revenuecat';
import { getPlanTier, refreshPlanTier } from '@/lib/subscription';

export default function PremiumScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [plan, setPlan] = useState<'free' | 'premium'>('free');
  const [monthlyPrice, setMonthlyPrice] = useState<string | null>(null);
  const [annualPrice, setAnnualPrice] = useState<string | null>(null);
  const [busyPlan, setBusyPlan] = useState<'monthly' | 'yearly' | null>(null);

  useEffect(() => {
    Promise.all([getPlanTier(), getMonthlyPackage(), getAnnualPackage()])
      .then(([tier, monthlyPkg, annualPkg]) => {
        setPlan(tier);
        if (monthlyPkg?.product?.priceString) {
          setMonthlyPrice(monthlyPkg.product.priceString);
        }
        if (annualPkg?.product?.priceString) {
          setAnnualPrice(annualPkg.product.priceString);
        }
      })
      .catch(() => {});
  }, []);

  async function handleUpgradeMonthly() {
    try {
      setBusyPlan('monthly');
      const pkg = await getMonthlyPackage();
      if (!pkg) {
        Alert.alert('Plan unavailable', 'Monthly plan is not available.');
        return;
      }
      const info = await purchasePackage(pkg);
      if (info) {
        await refreshPlanTier();
        setPlan('premium');
        Alert.alert('Premium unlocked', 'Premium features are now enabled.');
        router.back();
      } else {
        Alert.alert('Purchase unavailable', 'Unable to start purchase.');
      }
    } catch (error) {
      Alert.alert('Upgrade failed', 'Unable to unlock premium right now.');
      console.error(error);
    } finally {
      setBusyPlan(null);
    }
  }

  async function handleUpgradeAnnual() {
    try {
      setBusyPlan('yearly');
      const pkg = await getAnnualPackage();
      if (!pkg) {
        Alert.alert('Plan unavailable', 'Yearly plan is not available.');
        return;
      }
      const info = await purchasePackage(pkg);
      if (info) {
        await refreshPlanTier();
        setPlan('premium');
        Alert.alert('Premium unlocked', 'Premium features are now enabled.');
        router.back();
      } else {
        Alert.alert('Purchase unavailable', 'Unable to start purchase.');
      }
    } catch (error) {
      Alert.alert('Upgrade failed', 'Unable to unlock premium right now.');
      console.error(error);
    } finally {
      setBusyPlan(null);
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
          <ThemedText type="subtitle">Go Premium</ThemedText>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: theme.secondary }]}>
          <ThemedText style={[styles.heroTitle, { color: theme.onSecondary }]}>
            Unlock advanced tools
          </ThemedText>
          <ThemedText style={[styles.heroSubtitle, { color: theme.onSecondary }]}>
            Sync, export, and automate with Premium.
          </ThemedText>
        </View>

        <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <ThemedText style={styles.sectionTitle}>Premium includes</ThemedText>
          <View style={styles.featureRow}>
            <IconSymbol name="cloud.fill" size={18} color={theme.primaryDeep} />
            <ThemedText style={styles.featureText}>Google Drive backup & sync</ThemedText>
          </View>
          <View style={styles.featureRow}>
            <IconSymbol name="arrow.down.circle.fill" size={18} color={theme.primaryDeep} />
            <ThemedText style={styles.featureText}>CSV/PDF exports</ThemedText>
          </View>
          <View style={styles.featureRow}>
            <IconSymbol name="bell.fill" size={18} color={theme.primaryDeep} />
            <ThemedText style={styles.featureText}>Auto debtor reminders</ThemedText>
          </View>
          <View style={styles.featureRow}>
            <IconSymbol name="chart.bar.fill" size={18} color={theme.primaryDeep} />
            <ThemedText style={styles.featureText}>Advanced reports & trends</ThemedText>
          </View>
        </View>

        <View style={styles.planStack}>
          <ThemedText style={styles.sectionTitle}>Choose your plan</ThemedText>
          <Pressable
            onPress={handleUpgradeMonthly}
            disabled={plan === 'premium' || busyPlan === 'monthly'}
            style={[styles.planButton, { backgroundColor: theme.primary }]}>
            <View style={styles.planText}>
              <ThemedText style={styles.planButtonTitle}>
                {plan === 'premium' ? 'Premium active' : 'Monthly'}
              </ThemedText>
              <ThemedText style={styles.planButtonSubtitle}>
                Pay monthly, cancel anytime
              </ThemedText>
              <ThemedText style={styles.planButtonPriceInline}>
                {monthlyPrice ?? '₦1,000 / $2.99'}
              </ThemedText>
            </View>
            <ThemedText style={styles.planButtonPrice}>
              {plan === 'premium'
                ? 'Active'
                : busyPlan === 'monthly'
                  ? 'Processing...'
                  : monthlyPrice ?? 'Monthly'}
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={handleUpgradeAnnual}
            disabled={plan === 'premium' || busyPlan === 'yearly'}
            style={[styles.planButtonSecondary, { borderColor: theme.border }]}>
            <View style={styles.planText}>
              <View style={styles.planTitleRow}>
                <ThemedText style={[styles.planButtonTitle, { color: theme.text }]}>Yearly</ThemedText>
                <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                  <ThemedText style={styles.badgeText}>Most popular</ThemedText>
                </View>
              </View>
              <ThemedText style={[styles.planButtonSubtitle, { color: theme.muted }]}>
                Save more with annual billing
              </ThemedText>
              <ThemedText style={[styles.planButtonPriceInlineAlt, { color: theme.text }]}>
                {annualPrice ?? '₦10,000 / $29.99'}
              </ThemedText>
            </View>
            <ThemedText style={[styles.planButtonPriceAlt, { color: theme.text }]}>
              {busyPlan === 'yearly' ? 'Processing...' : annualPrice ?? 'Yearly'}
            </ThemedText>
          </Pressable>
        </View>

        <View style={[styles.linkCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <Pressable onPress={() => router.push('/restore')} style={styles.linkRow}>
            <ThemedText style={styles.linkText}>Restore purchases</ThemedText>
            <IconSymbol name="chevron.right" size={16} color={theme.muted} />
          </Pressable>
          <View style={[styles.linkDivider, { borderColor: theme.border }]} />
          <Pressable onPress={() => router.push('/manage-subscription')} style={styles.linkRow}>
            <ThemedText style={styles.linkText}>Manage subscription</ThemedText>
            <IconSymbol name="chevron.right" size={16} color={theme.muted} />
          </Pressable>
        </View>
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
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 18,
  },
  heroCard: {
    borderRadius: 18,
    padding: 18,
    gap: 8,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  heroSubtitle: {
    fontSize: 13,
    opacity: 0.9,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 13,
  },
  planStack: {
    gap: 12,
  },
  planButton: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planButtonSecondary: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planText: {
    gap: 4,
  },
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  planButtonTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  planButtonSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  planButtonPriceInline: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '600',
  },
  planButtonPrice: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  planButtonPriceAlt: {
    fontSize: 15,
    fontWeight: '600',
  },
  planButtonPriceInlineAlt: {
    fontSize: 12,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  linkCard: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  linkText: {
    fontSize: 13,
  },
  linkDivider: {
    borderTopWidth: 1,
  },
});
