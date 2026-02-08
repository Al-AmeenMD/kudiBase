import { getAppSetting, setAppSetting } from '@/lib/db';
import { getCustomerInfoSafe, hasPremiumEntitlement } from '@/lib/revenuecat';

export type PlanTier = 'free' | 'premium';

const PLAN_KEY = 'plan_tier';
const DEV_OVERRIDE_KEY = 'dev_premium_override';

export async function getPlanTier(): Promise<PlanTier> {
  const stored = await getAppSetting(PLAN_KEY);
  if (stored === 'premium') {
    return 'premium';
  }
  return 'free';
}

export async function setPlanTier(plan: PlanTier) {
  await setAppSetting(PLAN_KEY, plan);
}

/**
 * Check if user has premium access.
 * This always checks RevenueCat for the latest subscription status,
 * so expired subscriptions are automatically detected.
 */
export async function isPremium(): Promise<boolean> {
  // Check dev override first (for testing)
  const devOverride = await getAppSetting(DEV_OVERRIDE_KEY);
  if (devOverride === 'true') {
    return true;
  }

  // Check RevenueCat for real-time subscription status
  try {
    const info = await getCustomerInfoSafe();
    if (info) {
      const premium = hasPremiumEntitlement(info);
      // Update local cache to match RevenueCat
      await setPlanTier(premium ? 'premium' : 'free');
      return premium;
    }
  } catch (error) {
    // If offline or RevenueCat is temporarily unavailable, fall back to cached plan.
  }

  // Fallback to cached value if RevenueCat unavailable
  return (await getPlanTier()) === 'premium';
}

/**
 * Refresh plan tier from RevenueCat and update local cache.
 * Call this on app startup or when returning from background.
 */
export async function refreshPlanTier(): Promise<PlanTier> {
  try {
    const info = await getCustomerInfoSafe();
    if (!info) {
      return getPlanTier();
    }
    const premium = hasPremiumEntitlement(info);
    const plan: PlanTier = premium ? 'premium' : 'free';
    await setPlanTier(plan);
    return plan;
  } catch (error) {
    return getPlanTier();
  }
}
