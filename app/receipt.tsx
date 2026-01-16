import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getBusinessProfile, getSaleById, getSaleItems, initDb } from '@/lib/db';

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString('en-NG')}`;
}

function formatDateTime(ts: number) {
  return new Date(ts).toLocaleString('en-NG', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ReceiptScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { saleId } = useLocalSearchParams<{ saleId?: string }>();
  const receiptRef = useRef<View>(null);
  const [profile, setProfile] = useState<{
    businessName: string;
    ownerName?: string;
    phone?: string;
    address?: string;
    bankName?: string;
    accountNumber?: string;
  } | null>(null);
  const [sale, setSale] = useState<{
    id: string;
    sale_number: number;
    payment_method: string;
    subtotal: number;
    amount_paid: number;
    balance_due: number;
    customer_name: string | null;
    customer_phone: string | null;
    created_at: number;
  } | null>(null);
  const [items, setItems] = useState<
    Array<{ id: string; name_snapshot: string; unit_price: number; quantity: number; line_total: number }>
  >([]);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    async function load() {
      await initDb();
      if (!saleId) {
        return;
      }
      const [profileRow, saleRow, saleItems] = await Promise.all([
        getBusinessProfile(),
        getSaleById(saleId),
        getSaleItems(saleId),
      ]);
      setProfile(
        profileRow
          ? {
              businessName: profileRow.business_name,
              ownerName: profileRow.owner_name ?? undefined,
              phone: profileRow.phone ?? undefined,
              address: profileRow.address ?? undefined,
              bankName: profileRow.bank_name ?? undefined,
              accountNumber: profileRow.account_number ?? undefined,
            }
          : null
      );
      setSale(saleRow);
      setItems(saleItems);
    }
    load().catch((error) => {
      Alert.alert('Receipt error', 'Unable to load receipt.');
      console.error(error);
    });
  }, [saleId]);

  const totals = useMemo(() => {
    const total = sale?.subtotal ?? 0;
    const paid = sale?.amount_paid ?? 0;
    const due = Math.max(total - paid, 0);
    return { total, paid, due };
  }, [sale]);

  async function handleShare() {
    if (!receiptRef.current) {
      return;
    }
    try {
      setSharing(true);
      const uri = await captureRef(receiptRef, {
        format: 'png',
        quality: 1,
      });
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Sharing unavailable', 'Sharing is not available on this device.');
        return;
      }
      await Sharing.shareAsync(uri, { dialogTitle: 'Share receipt' });
    } catch (error) {
      Alert.alert('Share failed', 'Unable to share receipt.');
      console.error(error);
    } finally {
      setSharing(false);
    }
  }

  if (!sale) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.centered}>
          <ThemedText>Loading receipt...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ThemedText style={styles.backLabel}>Back</ThemedText>
          </Pressable>
          <View style={styles.headerTitle}>
            <ThemedText type="subtitle">Receipt</ThemedText>
            <ThemedText style={styles.headerMeta}>Share your receipt</ThemedText>
          </View>
          <View style={styles.headerSpacer} />
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ViewShot ref={receiptRef} style={styles.receiptCard} options={{ format: 'png', quality: 1 }}>
          <View style={styles.receiptHeader}>
            <ThemedText type="title" style={styles.receiptTitle}>
              Receipt
            </ThemedText>
            <ThemedText style={styles.receiptMeta}>No. #{sale.sale_number}</ThemedText>
            <ThemedText style={styles.receiptMeta}>{formatDateTime(sale.created_at)}</ThemedText>
          </View>

          <View style={styles.profileBlock}>
            <ThemedText style={styles.profileName}>
              {profile?.businessName ?? 'KudiBase Store'}
            </ThemedText>
            {profile?.address ? (
              <ThemedText style={styles.profileMeta}>{profile.address}</ThemedText>
            ) : null}
            {profile?.phone ? (
              <ThemedText style={styles.profileMeta}>{profile.phone}</ThemedText>
            ) : null}
          </View>

          <View style={styles.itemsBlock}>
            {items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <ThemedText style={styles.itemName}>{item.name_snapshot}</ThemedText>
                  <ThemedText style={styles.itemMeta}>
                    {item.quantity} x {formatNaira(item.unit_price)}
                  </ThemedText>
                </View>
                <ThemedText style={styles.itemTotal}>{formatNaira(item.line_total)}</ThemedText>
              </View>
            ))}
          </View>

          <View style={styles.totalBlock}>
            <View style={styles.totalRow}>
              <ThemedText style={styles.totalLabel}>Total</ThemedText>
              <ThemedText style={styles.totalValue}>{formatNaira(totals.total)}</ThemedText>
            </View>
            <View style={styles.totalRow}>
              <ThemedText style={styles.totalLabel}>Paid</ThemedText>
              <ThemedText style={styles.totalValue}>{formatNaira(totals.paid)}</ThemedText>
            </View>
            <View style={styles.totalRow}>
              <ThemedText style={styles.totalLabel}>Balance due</ThemedText>
              <ThemedText style={styles.totalValue}>{formatNaira(totals.due)}</ThemedText>
            </View>
          </View>

          <View style={styles.footerBlock}>
            <ThemedText style={styles.footerMeta}>Payment method: {sale.payment_method}</ThemedText>
            {profile?.bankName && profile?.accountNumber ? (
              <ThemedText style={styles.footerMeta}>
                Pay to: {profile.bankName} {profile.accountNumber}
              </ThemedText>
            ) : null}
            <ThemedText style={styles.footerThank}>Thank you for patronising us!</ThemedText>
            <View style={styles.footerBrandRow}>
              <Image source={require('@/assets/images/kudibase_logo.png')} style={styles.footerLogo} />
              <ThemedText style={styles.footerBrandText}>Generated by KudiBase App</ThemedText>
            </View>
          </View>
        </ViewShot>

        <Pressable
          onPress={handleShare}
          disabled={sharing}
          style={[styles.primaryButton, { backgroundColor: theme.primary }]}>
          <ThemedText style={styles.primaryButtonText}>
            {sharing ? 'Preparing...' : 'Share receipt'}
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
    paddingBottom: 4,
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E6E0D3',
  },
  backLabel: {
    fontSize: 12,
    color: '#0F6A3D',
  },
  headerTitle: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  headerMeta: {
    fontSize: 12,
    color: '#6B7280',
  },
  headerSpacer: {
    width: 56,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 20,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  receiptHeader: {
    gap: 4,
  },
  receiptTitle: {
    color: '#111111',
  },
  receiptMeta: {
    fontSize: 12,
    color: '#555555',
  },
  profileBlock: {
    gap: 4,
  },
  profileName: {
    fontSize: 16,
    color: '#111111',
  },
  profileMeta: {
    fontSize: 12,
    color: '#555555',
  },
  itemsBlock: {
    gap: 10,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontSize: 14,
    color: '#111111',
  },
  itemMeta: {
    fontSize: 12,
    color: '#777777',
  },
  itemTotal: {
    fontSize: 13,
    color: '#111111',
  },
  totalBlock: {
    borderTopWidth: 1,
    borderTopColor: '#E6E0D3',
    paddingTop: 12,
    gap: 6,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 12,
    color: '#444444',
  },
  totalValue: {
    fontSize: 13,
    color: '#111111',
  },
  footerBlock: {
    borderTopWidth: 1,
    borderTopColor: '#E6E0D3',
    paddingTop: 12,
    gap: 6,
  },
  footerMeta: {
    fontSize: 12,
    color: '#555555',
  },
  footerThank: {
    fontSize: 13,
    color: '#111111',
  },
  footerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
  },
  footerLogo: {
    width: 18,
    height: 18,
    borderRadius: 4,
  },
  footerBrandText: {
    fontSize: 11,
    color: '#777777',
  },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16 },
});
