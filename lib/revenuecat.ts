import Purchases, { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import PurchasesUI from 'react-native-purchases-ui';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

type RevenueCatConfig = {
  androidApiKey?: string;
  iosApiKey?: string;
  entitlement?: string;
};

let configured = false;
let customerInfoPromise: Promise<CustomerInfo> | null = null;
const CUSTOMER_INFO_TIMEOUT_MS = 1500;

function withTimeout<T>(promise: Promise<T>, ms: number) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<T>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('RevenueCat request timed out'));
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }) as Promise<T>;
}

function getConfig(): RevenueCatConfig {
  const config = Constants.expoConfig?.extra?.revenuecat as RevenueCatConfig | undefined;
  return config ?? {};
}

export function getEntitlementId() {
  return getConfig().entitlement ?? 'kudibase_pro';
}

export async function configureRevenueCat() {
  if (configured) {
    return true;
  }
  const config = getConfig();
  const apiKey = Platform.OS === 'ios' ? config.iosApiKey : config.androidApiKey;
  if (!apiKey || apiKey.startsWith('REVENUECAT_')) {
    return false;
  }
  Purchases.setLogLevel(Purchases.LOG_LEVEL.INFO);
  Purchases.configure({ apiKey });
  configured = true;
  return true;
}

export async function getCustomerInfoSafe() {
  const ok = await configureRevenueCat();
  if (!ok) {
    return null;
  }
  if (customerInfoPromise) {
    return customerInfoPromise;
  }
  customerInfoPromise = withTimeout(Purchases.getCustomerInfo(), CUSTOMER_INFO_TIMEOUT_MS);
  try {
    return await customerInfoPromise;
  } finally {
    customerInfoPromise = null;
  }
}

export function hasPremiumEntitlement(info: CustomerInfo | null) {
  if (!info) {
    return false;
  }
  const entitlementId = getEntitlementId();
  return Boolean(info.entitlements?.active?.[entitlementId]);
}

export async function getMonthlyPackage(): Promise<PurchasesPackage | null> {
  const ok = await configureRevenueCat();
  if (!ok) {
    return null;
  }
  const offerings = await Purchases.getOfferings();
  const available = offerings.current?.availablePackages ?? [];
  return available.find((pkg) => pkg.packageType === '$rc_monthly') ?? null;
}

export async function getAnnualPackage(): Promise<PurchasesPackage | null> {
  const ok = await configureRevenueCat();
  if (!ok) {
    return null;
  }
  const offerings = await Purchases.getOfferings();
  const available = offerings.current?.availablePackages ?? [];
  return available.find((pkg) => pkg.packageType === '$rc_annual') ?? null;
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo | null> {
  const ok = await configureRevenueCat();
  if (!ok) {
    return null;
  }
  const result = await withTimeout(Purchases.purchasePackage(pkg), 30000);
  return result.customerInfo;
}

export async function restorePurchasesSafe(): Promise<CustomerInfo | null> {
  const ok = await configureRevenueCat();
  if (!ok) {
    return null;
  }
  return Purchases.restorePurchases();
}

export async function presentPaywall(): Promise<CustomerInfo | null> {
  const ok = await configureRevenueCat();
  if (!ok) {
    return null;
  }
  const result = await PurchasesUI.presentPaywall();
  return result?.customerInfo ?? null;
}

export async function presentCustomerCenter(): Promise<void> {
  const ok = await configureRevenueCat();
  if (!ok) {
    return;
  }
  await PurchasesUI.presentCustomerCenter();
}
