import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrency } from '@/hooks/use-currency';
import { getSalesList, initDb } from '@/lib/db';

function formatDateTime(ts: number) {
  return new Date(ts).toLocaleString('en-NG', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ReceiptsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { format } = useCurrency();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [receipts, setReceipts] = useState<
    {
      id: string;
      sale_number: number;
      payment_method: string;
      subtotal: number;
      amount_paid: number;
      balance_due: number;
      customer_name?: string | null;
      created_at: number;
    }[]
  >([]);
  const [receiptSearch, setReceiptSearch] = useState('');
  const [receiptFilter, setReceiptFilter] = useState<'All' | 'Cash' | 'Transfer' | 'POS' | 'Pay Later'>('All');

  const loadReceipts = useCallback(async () => {
    await initDb();
    const rows = await getSalesList(80);
    setReceipts(rows);
  }, []);

  useEffect(() => {
    loadReceipts().catch((error) => {
      Alert.alert('Load error', 'Unable to load receipts.');
      console.error(error);
    });
  }, [loadReceipts]);

  useFocusEffect(
    useCallback(() => {
      loadReceipts().catch((error) => {
        Alert.alert('Load error', 'Unable to refresh receipts.');
        console.error(error);
      });
    }, [loadReceipts])
  );

  const filteredReceipts = useMemo(() => {
    const term = receiptSearch.trim().toLowerCase();
    let list = receipts;
    if (receiptFilter !== 'All') {
      list = list.filter((row) => row.payment_method === receiptFilter);
    }
    if (term) {
      list = list.filter((row) => {
        const numberMatch = String(row.sale_number).includes(term);
        const methodMatch = row.payment_method.toLowerCase().includes(term);
        const nameMatch = row.customer_name?.toLowerCase().includes(term);
        return numberMatch || methodMatch || Boolean(nameMatch);
      });
    }
    return list;
  }, [receipts, receiptFilter, receiptSearch]);

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top - 8, 0) }]}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backButton, { borderColor: theme.border }]}>
            <IconSymbol name="chevron.left" size={20} color={theme.primaryDeep} />
          </Pressable>
          <View style={styles.headerTitle}>
            <ThemedText type="subtitle">Receipts</ThemedText>
            <ThemedText style={styles.headerMeta}>Recent sales</ThemedText>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? Math.max(insets.top, 12) : 0}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
        <View style={styles.filterBlock}>
          <TextInput
            value={receiptSearch}
            onChangeText={setReceiptSearch}
            placeholder="Search by receipt number or method"
            placeholderTextColor={theme.muted}
            style={[
              styles.searchInput,
              { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text },
            ]}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {(['All', 'Cash', 'Transfer', 'POS', 'Pay Later'] as const).map((method) => (
              <Pressable
                key={method}
                onPress={() => setReceiptFilter(method)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: receiptFilter === method ? theme.primary : theme.surface,
                    borderColor: theme.border,
                  },
                ]}>
                <ThemedText style={{ color: receiptFilter === method ? '#FFFFFF' : theme.text }}>
                  {method}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {filteredReceipts.length === 0 ? (
          <View style={styles.emptyState}>
            <ThemedText style={[styles.emptyText, { color: theme.muted }]}>
              No receipts yet.
            </ThemedText>
          </View>
        ) : (
          <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            {filteredReceipts.map((receipt, index) => (
              <Pressable
                key={receipt.id}
                onPress={() => router.push({ pathname: '/receipt', params: { saleId: receipt.id } })}
                style={[
                  styles.row,
                  index > 0 && [styles.rowDivider, { borderTopColor: theme.border }],
                ]}>
                <View>
                  <ThemedText style={styles.rowTitle}>
                    Receipt #{receipt.sale_number}
                  </ThemedText>
                  <ThemedText style={[styles.rowMeta, { color: theme.muted }]}>
                    {(receipt.customer_name ?? 'Walk-in customer')} • {receipt.payment_method} •{' '}
                    {formatDateTime(receipt.created_at)}
                  </ThemedText>
                </View>
                <View style={styles.rowRight}>
                  <ThemedText style={styles.rowValue}>{format(receipt.subtotal)}</ThemedText>
                  {receipt.balance_due > 0 ? (
                    <ThemedText style={[styles.rowMeta, { color: theme.muted }]}>
                      Due {format(receipt.balance_due)}
                    </ThemedText>
                  ) : (
                    <ThemedText style={[styles.rowMeta, { color: theme.muted }]}>Paid</ThemedText>
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardWrap: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
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
    borderColor: '#E6E0D3',
  },
  headerTitle: {
    flex: 1,
    gap: 4,
  },
  headerMeta: {
    fontSize: 12,
    color: '#6B7280',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 12,
  },
  filterBlock: {
    gap: 10,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: 'Sora-Regular',
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowDivider: {
    borderTopWidth: 1,
  },
  rowTitle: {
    fontSize: 14,
  },
  rowMeta: {
    fontSize: 12,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  rowValue: {
    fontSize: 14,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: { fontSize: 13 },
});
