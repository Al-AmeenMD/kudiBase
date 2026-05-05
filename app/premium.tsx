import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';

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

const FEATURES = [
  {
    title: 'Cloud Backup & Sync',
    description: 'Keep your data safe with automated Google Drive sync across devices.',
    icon: 'cloud.fill',
  },
  {
    title: 'Professional Exports',
    description: 'Generate high-quality PDF and CSV reports for your accounting.',
    icon: 'doc.text.fill',
  },
  {
    title: 'Smart Reminders',
    description: 'Auto-send payment reminders to customers via WhatsApp.',
    icon: 'bell.badge.fill',
  },
  {
    title: 'Advanced Analytics',
    description: 'Unlock deep insights into your sales trends and profit margins.',
    icon: 'chart.bar.xaxis',
  },
];

export default function PremiumScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [plan, setPlan] = useState<'free' | 'premium'>('free');
  const [monthlyPrice, setMonthlyPrice] = useState<string | null>(null);
  const [annualPrice, setAnnualPrice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyPlan, setBusyPlan] = useState<'monthly' | 'yearly' | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const [tier, monthlyPkg, annualPkg] = await Promise.all([
          getPlanTier(),
          getMonthlyPackage(),
          getAnnualPackage()
        ]);
        setPlan(tier);
        if (monthlyPkg?.product?.priceString) setMonthlyPrice(monthlyPkg.product.priceString);
        if (annualPkg?.product?.priceString) setAnnualPrice(annualPkg.product.priceString);
      } catch (error) {
        console.error('Failed to load packages:', error);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  async function handlePurchase(type: 'monthly' | 'yearly') {
    try {
      setBusyPlan(type);
      const pkg = type === 'monthly' ? await getMonthlyPackage() : await getAnnualPackage();
      
      if (!pkg) {
        Alert.alert('Plan unavailable', 'This plan is currently not available in your region.');
        return;
      }

      const info = await purchasePackage(pkg);
      if (info) {
        await refreshPlanTier();
        setPlan('premium');
        Alert.alert('Welcome to Pro!', 'You now have full access to all KudiBase Pro features.');
        router.back();
      }
    } catch (error: any) {
      if (error.userCancelled) return;
      Alert.alert('Purchase Error', 'Something went wrong. Please try again later.');
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

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Premium Header */}
        <LinearGradient
          colors={[theme.primaryDeep, theme.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerGradient, { paddingTop: insets.top + 20 }]}>
          
          <Pressable onPress={() => router.back()} style={styles.closeButton}>
            <IconSymbol name="xmark" size={20} color="#FFF" />
          </Pressable>

          <Animated.View entering={FadeInUp.delay(200)} style={styles.headerContent}>
            <View style={styles.proBadge}>
              <ThemedText style={styles.proBadgeText}>PRO</ThemedText>
            </View>
            <ThemedText style={styles.headerTitle}>KudiBase Pro</ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              Empower your business with elite tools
            </ThemedText>
          </Animated.View>
        </LinearGradient>

        <View style={styles.body}>
          {/* Features Grid */}
          <View style={styles.featuresContainer}>
            {FEATURES.map((feature, index) => (
              <Animated.View 
                key={feature.title}
                entering={FadeInDown.delay(300 + index * 100)}
                style={[styles.featureCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={[styles.featureIcon, { backgroundColor: theme.secondary }]}>
                  <IconSymbol name={feature.icon as any} size={22} color={theme.primaryDeep} />
                </View>
                <View style={styles.featureTextContainer}>
                  <ThemedText style={styles.featureTitle}>{feature.title}</ThemedText>
                  <ThemedText style={styles.featureDesc}>{feature.description}</ThemedText>
                </View>
              </Animated.View>
            ))}
          </View>

          {/* Pricing Section */}
          <View style={styles.pricingContainer}>
            <ThemedText style={styles.pricingHeader}>Choose Your Plan</ThemedText>
            
            {/* Yearly Plan (Highlight) */}
            <Pressable 
              onPress={() => handlePurchase('yearly')}
              disabled={plan === 'premium' || busyPlan !== null}
              style={[
                styles.planCard, 
                styles.yearlyCard, 
                { borderColor: theme.primary }
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
                <ThemedText style={styles.planPrice}>{annualPrice || '₦10,000'}</ThemedText>
                <ThemedText style={styles.planPeriod}>/ year</ThemedText>
              </View>
              {busyPlan === 'yearly' && <ActivityIndicator style={styles.planLoader} color="#FFF" />}
            </Pressable>

            {/* Monthly Plan */}
            <Pressable 
              onPress={() => handlePurchase('monthly')}
              disabled={plan === 'premium' || busyPlan !== null}
              style={[
                styles.planCard, 
                { backgroundColor: theme.surface, borderColor: theme.border }
              ]}>
              <View style={styles.planInfo}>
                <ThemedText style={[styles.planName, { color: theme.text }]}>Monthly</ThemedText>
                <ThemedText style={styles.planSubtitle}>Flexible, pay as you go</ThemedText>
              </View>
              <View style={styles.planPriceContainer}>
                <ThemedText style={[styles.planPrice, { color: theme.text }]}>{monthlyPrice || '₦1,000'}</ThemedText>
                <ThemedText style={styles.planPeriod}>/ mo</ThemedText>
              </View>
              {busyPlan === 'monthly' && <ActivityIndicator style={styles.planLoader} color={theme.primary} />}
            </Pressable>
          </View>

          {/* Social Proof */}
          <View style={styles.trustBar}>
            <IconSymbol name="checkmark.seal.fill" size={16} color={theme.primary} />
            <ThemedText style={styles.trustText}>
              Trusted by 5,000+ Nigerian Small Businesses
            </ThemedText>
          </View>

          {/* Footer Links */}
          <View style={styles.footer}>
            <Pressable onPress={() => router.push('/restore')}>
              <ThemedText style={styles.footerLink}>Restore Purchase</ThemedText>
            </Pressable>
            <View style={styles.dot} />
            <Pressable onPress={() => router.push('/privacy')}>
              <ThemedText style={styles.footerLink}>Privacy Policy</ThemedText>
            </Pressable>
            <View style={styles.dot} />
            <Pressable>
              <ThemedText style={styles.footerLink}>Terms</ThemedText>
            </Pressable>
          </View>
        </View>
      </ScrollView>
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
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 8,
    letterSpacing: -0.5,
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
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
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
    opacity: 0.6,
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
    letterSpacing: 1,
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
    gap: 8,
  },
  planName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
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
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  planPriceContainer: {
    alignItems: 'flex-end',
  },
  planPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
  },
  planPeriod: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  planLoader: {
    position: 'absolute',
    right: 10,
    top: 10,
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
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  footerLink: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.4,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
});

