import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getAnnualPackage, getMonthlyPackage, purchasePackage } from '@/lib/revenuecat';
import { getPlanTier, refreshPlanTier } from '@/lib/subscription';

type NoticeState = {
  title: string;
  message: string;
  variant: 'default' | 'destructive' | 'success';
  onDone?: () => void;
};

const FEATURES: { title: string; description: string; icon: IconSymbolName }[] = [
  {
    title: 'Professional Exports',
    description: 'Generate PDF and CSV reports for sales, profit, products, and customers.',
    icon: 'arrow.up.circle.fill',
  },
  {
    title: 'Smart Reminders',
    description: 'Send polished payment reminders with your business details included.',
    icon: 'bell.fill',
  },
  {
    title: 'Advanced Analytics',
    description: 'Unlock deeper insights into sales trends and profit margins.',
    icon: 'chart.bar.fill',
  },
  {
    title: 'Inventory Insights',
    description: 'Spot dead stock and products that need attention.',
    icon: 'archivebox.fill',
  },
];

export default function PremiumScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const premiumSurface = isDark ? '#1E2024' : '#FFFFFF';
  const premiumBorder = isDark ? theme.border : '#E6E0D3';
  const premiumText = isDark ? theme.text : '#1E1E1E';
  const premiumMuted = isDark ? theme.muted : '#6B7280';
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [plan, setPlan] = useState<'free' | 'premium'>('free');
  const [monthlyPrice, setMonthlyPrice] = useState<string | null>(null);
  const [annualPrice, setAnnualPrice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyPlan, setBusyPlan] = useState<'monthly' | 'yearly' | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const [tier, monthlyPkg, annualPkg] = await Promise.all([
          getPlanTier(),
          getMonthlyPackage(),
          getAnnualPackage(),
        ]);
        setPlan(tier);
        setMonthlyPrice(monthlyPkg?.product?.priceString ?? null);
        setAnnualPrice(annualPkg?.product?.priceString ?? null);
      } catch (error) {
        console.error('Failed to load premium packages:', error);
        showNotice('Plans unavailable', 'Unable to load Premium plans right now. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  function showNotice(
    title: string,
    message: string,
    variant: NoticeState['variant'] = 'destructive',
    onDone?: () => void
  ) {
    setNotice({ title, message, variant, onDone });
  }

  function closeNotice() {
    const onDone = notice?.onDone;
    setNotice(null);
    onDone?.();
  }

  async function handlePurchase(type: 'monthly' | 'yearly') {
    try {
      setBusyPlan(type);
      const pkg = type === 'monthly' ? await getMonthlyPackage() : await getAnnualPackage();

      if (!pkg) {
        showNotice('Plan unavailable', 'This plan is currently not available in your region.');
        return;
      }

      const info = await purchasePackage(pkg);
      if (info) {
        await refreshPlanTier();
        setPlan('premium');
        showNotice(
          'Premium activated',
          'You now have access to KudiBase Premium features.',
          'success',
          () => router.back()
        );
      }
    } catch (error: any) {
      if (error?.userCancelled) return;
      showNotice('Purchase failed', 'Something went wrong. Please try again later.');
    } finally {
      setBusyPlan(null);
    }
  }

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  const isPremiumActive = plan === 'premium';
  const annualAvailable = Boolean(annualPrice);
  const monthlyAvailable = Boolean(monthlyPrice);

  return (
    <ThemedView
      lightColor="#F9F6EF"
      darkColor="#151718"
      style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[theme.primaryDeep, theme.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerGradient, { paddingTop: insets.top + 20 }]}>
          <Pressable onPress={() => router.back()} style={styles.closeButton}>
            <IconSymbol name="xmark" size={20} color="#FFFFFF" />
          </Pressable>

          <Animated.View entering={FadeInUp.delay(160)} style={styles.headerContent}>
            <View style={styles.proBadge}>
              <ThemedText style={styles.proBadgeText}>{isPremiumActive ? 'ACTIVE' : 'PREMIUM'}</ThemedText>
            </View>
            <ThemedText style={styles.headerTitle}>KudiBase Premium</ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              Reports, reminders, and insights for growing shops.
            </ThemedText>
          </Animated.View>
        </LinearGradient>

        <View style={styles.body}>
          <View style={styles.featuresContainer}>
            {FEATURES.map((feature, index) => (
              <Animated.View
                key={feature.title}
                entering={FadeInDown.delay(240 + index * 80)}
                style={[
                  styles.featureCard,
                  {
                    backgroundColor: premiumSurface,
                    borderColor: premiumBorder,
                    shadowOpacity: isDark ? 0.05 : 0.08,
                  },
                ]}>
                <View style={[styles.featureIcon, { backgroundColor: theme.secondary }]}>
                  <IconSymbol name={feature.icon} size={22} color={theme.primaryDeep} />
                </View>
                <View style={styles.featureTextContainer}>
                  <ThemedText style={[styles.featureTitle, { color: premiumText }]}>{feature.title}</ThemedText>
                  <ThemedText style={[styles.featureDesc, { color: premiumMuted }]}>
                    {feature.description}
                  </ThemedText>
                </View>
              </Animated.View>
            ))}
          </View>

          {isPremiumActive ? (
            <View style={styles.pricingContainer}>
              <ThemedText style={styles.pricingHeader}>Subscription</ThemedText>
              <View style={[styles.activeCard, { backgroundColor: premiumSurface, borderColor: premiumBorder }]}>
                <ThemedText style={[styles.activeTitle, { color: premiumText }]}>Premium is active</ThemedText>
                <ThemedText style={[styles.activeText, { color: premiumMuted }]}>
                  Manage billing or restore your purchase from the store account used to subscribe.
                </ThemedText>
                <View style={styles.activeActions}>
                  <Pressable
                    onPress={() => router.push('/manage-subscription')}
                    style={[styles.secondaryButton, { borderColor: theme.border }]}>
                    <ThemedText style={styles.secondaryButtonText}>Manage</ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => router.push('/restore')}
                    style={[styles.secondaryButton, { borderColor: theme.border }]}>
                    <ThemedText style={styles.secondaryButtonText}>Restore</ThemedText>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.pricingContainer}>
              <ThemedText style={styles.pricingHeader}>Choose Your Plan</ThemedText>

              <Pressable
                onPress={() => handlePurchase('yearly')}
                disabled={busyPlan !== null || !annualAvailable}
                style={[
                  styles.planCard,
                  styles.yearlyCard,
                  { borderColor: theme.primary },
                  !annualAvailable && styles.planDisabled,
                ]}>
                <View style={styles.planInfo}>
                  <View style={styles.planTitleRow}>
                    <ThemedText style={styles.planName}>Yearly Access</ThemedText>
                    <View style={styles.saveBadge}>
                      <ThemedText style={styles.saveBadgeText}>SAVE 20%</ThemedText>
                    </View>
                  </View>
                  <ThemedText style={styles.planSubtitle}>Best value for growing businesses</ThemedText>
                </View>
                <View style={styles.planPriceContainer}>
                  {busyPlan === 'yearly' ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : annualPrice ? (
                    <>
                      <ThemedText style={styles.planPrice}>{annualPrice}</ThemedText>
                      <ThemedText style={styles.planPeriod}>/ year</ThemedText>
                    </>
                  ) : (
                    <ThemedText style={styles.unavailableOnPrimary}>Unavailable</ThemedText>
                  )}
                </View>
              </Pressable>

              <Pressable
                onPress={() => handlePurchase('monthly')}
                disabled={busyPlan !== null || !monthlyAvailable}
                style={[
                  styles.planCard,
                  { backgroundColor: premiumSurface, borderColor: premiumBorder },
                  !monthlyAvailable && styles.planDisabled,
                ]}>
                <View style={styles.planInfo}>
                  <ThemedText style={[styles.planName, { color: premiumText }]}>Monthly</ThemedText>
                  <ThemedText style={[styles.planSubtitle, { color: premiumMuted }]}>
                    Flexible, pay as you go
                  </ThemedText>
                </View>
                <View style={styles.planPriceContainer}>
                  {busyPlan === 'monthly' ? (
                    <ActivityIndicator color={theme.primary} size="small" />
                  ) : monthlyPrice ? (
                    <>
                      <ThemedText style={[styles.planPrice, { color: premiumText }]}>{monthlyPrice}</ThemedText>
                      <ThemedText style={[styles.planPeriod, { color: premiumMuted }]}>/ month</ThemedText>
                    </>
                  ) : (
                    <ThemedText style={[styles.unavailableText, { color: premiumMuted }]}>
                      Unavailable
                    </ThemedText>
                  )}
                </View>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={notice !== null}
        title={notice?.title ?? ''}
        message={notice?.message ?? ''}
        confirmLabel="OK"
        iconName={notice?.variant === 'success' ? 'checkmark.circle.fill' : 'questionmark.circle.fill'}
        variant={notice?.variant ?? 'default'}
        showCancel={false}
        onCancel={closeNotice}
        onConfirm={closeNotice}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 60 },
  headerGradient: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  closeButton: {
    position: 'absolute',
    right: 24,
    top: 50,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  headerContent: {
    alignItems: 'center',
    marginTop: 10,
  },
  proBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  proBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    maxWidth: '80%',
  },
  body: {
    paddingHorizontal: 24,
    marginTop: -20,
  },
  featuresContainer: {
    gap: 12,
    marginBottom: 32,
  },
  featureCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTextContainer: {
    flex: 1,
    gap: 2,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  featureDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  pricingContainer: {
    gap: 16,
    marginBottom: 24,
  },
  pricingHeader: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    opacity: 0.5,
    textAlign: 'center',
    marginBottom: 4,
  },
  planCard: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  yearlyCard: {
    backgroundColor: '#0F6A3D',
    shadowColor: '#0F6A3D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  planInfo: {
    flex: 1,
    gap: 4,
  },
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  planName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  planSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  saveBadge: {
    backgroundColor: '#F28C28',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  saveBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  planPriceContainer: {
    minWidth: 92,
    alignItems: 'flex-end',
  },
  planPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'right',
  },
  planPeriod: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  unavailableText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  unavailableOnPrimary: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  trustBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 40,
  },
  trustText: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.5,
  },
  activeCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 10,
  },
  activeTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  activeText: {
    fontSize: 12,
    lineHeight: 18,
  },
  activeActions: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 4,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  planDisabled: {
    opacity: 0.72,
  },
});
