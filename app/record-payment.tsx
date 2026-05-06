import { useEffect, useMemo, useState } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrency } from '@/hooks/use-currency';
import { getAppSetting, getSaleById, initDb, recordPayment } from '@/lib/db';
import { cancelDebtReminder } from '@/lib/notifications';

type PaymentMethod = 'Cash' | 'Transfer' | 'POS';

function formatNumberInput(value: string) {
  const digits = value.replace(/[^\d]/g, '');
  if (!digits) {
    return '';
  }
  const number = Number(digits);
  return Number.isFinite(number) ? number.toLocaleString('en-NG') : '';
}

function parseNumberInput(value: string) {
  const digits = value.replace(/[^\d]/g, '');
  return digits ? Number(digits) : 0;
}

export default function RecordPaymentScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const router = useRouter();
  const { format } = useCurrency();
  const { saleId } = useLocalSearchParams<{ saleId?: string }>();
  const [sale, setSale] = useState<{
    id: string;
    sale_number: number;
    balance_due: number;
    customer_name: string | null;
  } | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('Cash');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      if (!saleId) {
        return;
      }
      await initDb();
      const row = await getSaleById(saleId);
      if (row) {
        setSale({
          id: row.id,
          sale_number: row.sale_number,
          balance_due: row.balance_due,
          customer_name: row.customer_name,
        });
      }
    }
    load().catch((error) => {
      Alert.alert('Load error', 'Unable to load sale.');
      console.error(error);
    });
  }, [saleId]);

  const maxAmount = useMemo(() => sale?.balance_due ?? 0, [sale]);

  async function handleSave() {
    if (!sale) {
      return;
    }
    const value = parseNumberInput(amount);
    if (!Number.isFinite(value) || value <= 0) {
      Alert.alert('Invalid amount', 'Enter a valid payment amount.');
      return;
    }
    if (value > maxAmount) {
      Alert.alert('Too much', 'Amount exceeds balance due.');
      return;
    }

    try {
      setSaving(true);
      await recordPayment({
        saleId: sale.id,
        amount: value,
        method,
        note: note.trim() || undefined,
      });

      // If this payment fully settles the debt, cancel the notification
      if (value >= maxAmount) {
        try {
          const notifId = await getAppSetting(`debt_notif_${sale.id}`);
          if (notifId) {
            await cancelDebtReminder(notifId);
          }
        } catch {
          // Best-effort cancellation
        }
      }

      router.back();
    } catch (error) {
      Alert.alert('Save failed', 'Unable to record payment.');
      console.error(error);
    } finally {
      setSaving(false);
    }
  }

  if (!sale) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.centered}>
          <ThemedText>Loading...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <ThemedText type="title">Record payment</ThemedText>
            <ThemedText style={[styles.caption, { color: theme.muted }]}>
              {sale.customer_name ?? `Sale #${sale.sale_number}`}
            </ThemedText>
          </View>

          <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <View style={styles.summaryRow}>
              <ThemedText style={[styles.summaryLabel, { color: theme.muted }]}>Balance due</ThemedText>
              <ThemedText style={styles.summaryValue}>{format(maxAmount)}</ThemedText>
            </View>
            <View style={styles.inputBlock}>
              <ThemedText style={[styles.label, { color: theme.muted }]}>Amount received</ThemedText>
              <TextInput
                value={amount}
                onChangeText={(value) => setAmount(formatNumberInput(value))}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={theme.muted}
                style={[
                  styles.textInput,
                  { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text },
                ]}
              />
            </View>
            <View style={styles.inputBlock}>
              <ThemedText style={[styles.label, { color: theme.muted }]}>Payment method</ThemedText>
              <View style={styles.methodRow}>
                {(['Cash', 'Transfer', 'POS'] as PaymentMethod[]).map((value) => (
                  <Pressable
                    key={value}
                    onPress={() => setMethod(value)}
                    style={[
                      styles.methodChip,
                      {
                        backgroundColor: method === value ? theme.primary : theme.surface,
                        borderColor: theme.border,
                      },
                    ]}>
                    <ThemedText style={{ color: method === value ? '#FFFFFF' : theme.text }}>
                      {value}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={styles.inputBlock}>
              <ThemedText style={[styles.label, { color: theme.muted }]}>Note (optional)</ThemedText>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Paid part of balance"
                placeholderTextColor={theme.muted}
                style={[
                  styles.textInput,
                  { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text },
                ]}
              />
            </View>
          </View>

          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}>
            <ThemedText style={styles.primaryButtonText}>
              {saving ? 'Saving...' : 'Save payment'}
            </ThemedText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardWrap: { flex: 1 },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 24,
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { gap: 8 },
  caption: { fontSize: 14 },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: { fontSize: 12 },
  summaryValue: { fontSize: 16 },
  inputBlock: { gap: 6 },
  label: { fontSize: 12 },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'Sora-Regular',
  },
  methodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  methodChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16 },
});
