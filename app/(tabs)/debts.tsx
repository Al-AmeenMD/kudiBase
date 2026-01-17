import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrency } from '@/hooks/use-currency';
import {
  getBusinessProfile,
  getOutstandingSales,
  getPaymentsBySale,
  initDb,
  markSalePaid,
} from '@/lib/db';

function formatDueDate(dateIso?: string | null) {
  if (!dateIso) {
    return 'No due date';
  }
  const date = new Date(dateIso);
  return date.toLocaleDateString('en-NG', { day: '2-digit', month: 'short' });
}

function normalizePhone(phone?: string | null) {
  if (!phone) {
    return null;
  }
  const digits = phone.replace(/\D/g, '');
  if (!digits) {
    return null;
  }
  if (digits.startsWith('0')) {
    return `234${digits.slice(1)}`;
  }
  if (digits.startsWith('234')) {
    return digits;
  }
  return `234${digits}`;
}

export default function DebtsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { format } = useCurrency();
  const router = useRouter();
  const [rows, setRows] = useState<
    Array<{
      id: string;
      sale_number: number;
      customer_name: string | null;
      customer_phone: string | null;
      balance_due: number;
      due_date: string | null;
      created_at: number;
    }>
  >([]);
  const [profile, setProfile] = useState<{
    businessName: string;
    ownerName?: string;
    bankName?: string;
    accountNumber?: string;
    reminderTemplate?: string | null;
  } | null>(null);
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<
    Record<string, Array<{ id: string; amount: number; method: string; note: string | null; created_at: number }>>
  >({});
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  const [remindTarget, setRemindTarget] = useState<(typeof rows)[number] | null>(null);
  const [remindText, setRemindText] = useState('');

  const loadDebts = useCallback(async () => {
    await initDb();
    const [outstanding, profileRow] = await Promise.all([
      getOutstandingSales(),
      getBusinessProfile(),
    ]);
    setRows(outstanding);
    setPaymentHistory({});
    setProfile(
      profileRow
        ? {
            businessName: profileRow.business_name,
            ownerName: profileRow.owner_name ?? undefined,
            bankName: profileRow.bank_name ?? undefined,
            accountNumber: profileRow.account_number ?? undefined,
            reminderTemplate: profileRow.reminder_template ?? null,
          }
        : null
    );
  }, []);

  useEffect(() => {
    loadDebts().catch((error) => {
      Alert.alert('Load error', 'Unable to load debts.');
      console.error(error);
    });
  }, [loadDebts]);

  useFocusEffect(
    useCallback(() => {
      loadDebts().catch((error) => {
        Alert.alert('Load error', 'Unable to refresh debts.');
        console.error(error);
      });
    }, [loadDebts])
  );

  const totalDue = useMemo(() => rows.reduce((sum, row) => sum + row.balance_due, 0), [rows]);
  const dueToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return rows.reduce((sum, row) => {
      if (!row.due_date) {
        return sum;
      }
      const due = new Date(row.due_date);
      due.setHours(0, 0, 0, 0);
      return due.getTime() === today.getTime() ? sum + row.balance_due : sum;
    }, 0);
  }, [rows]);

  function buildMessage(row: (typeof rows)[number]) {
    return buildMessageWithProfile(row, profile);
  }

  function buildMessageWithProfile(
    row: (typeof rows)[number],
    profileData: typeof profile
  ) {
    const base =
      profileData?.reminderTemplate ??
      'Hello {customerName}, this is {businessName}. You have an outstanding balance of {amount}. Please pay to {accountName} ({bankName} {accountNumber}). Thank you.';
    let message = base
      .replace('{customerName}', row.customer_name ?? 'customer')
      .replace('{businessName}', profileData?.businessName ?? 'your business')
      .replace('{amount}', format(row.balance_due))
      .replace('{accountName}', profileData?.ownerName ?? 'Account name')
      .replace('{bankName}', profileData?.bankName ?? 'Bank')
      .replace('{accountNumber}', profileData?.accountNumber ?? '0000000000');
    const hasBusinessPlaceholder = base.includes('{businessName}');
    const hasAccountPlaceholders =
      base.includes('{accountName}') || base.includes('{bankName}') || base.includes('{accountNumber}');
    if (!hasBusinessPlaceholder && profileData?.businessName) {
      message = `${message}\nFrom ${profileData.businessName}.`;
    }
    if (
      !hasAccountPlaceholders &&
      profileData?.ownerName &&
      profileData?.bankName &&
      profileData?.accountNumber
    ) {
      message = `${message}\nPay to: ${profileData.ownerName} (${profileData.bankName} ${profileData.accountNumber}).`;
    }
    return message;
  }

  async function handleRemind(row: (typeof rows)[number]) {
    const phone = normalizePhone(row.customer_phone);
    if (!phone) {
      Alert.alert('Missing phone', 'Add a phone number to send a reminder.');
      return;
    }
    const latestProfileRow = await getBusinessProfile();
    const latestProfile = latestProfileRow
      ? {
          businessName: latestProfileRow.business_name,
          ownerName: latestProfileRow.owner_name ?? undefined,
          bankName: latestProfileRow.bank_name ?? undefined,
          accountNumber: latestProfileRow.account_number ?? undefined,
          reminderTemplate: latestProfileRow.reminder_template ?? null,
        }
      : null;
    if (latestProfile) {
      setProfile(latestProfile);
    }
    setRemindTarget(row);
    setRemindText(buildMessageWithProfile(row, latestProfile ?? profile));
  }

  async function sendReminder() {
    if (!remindTarget) {
      return;
    }
    const phone = normalizePhone(remindTarget.customer_phone);
    if (!phone) {
      Alert.alert('Missing phone', 'Add a phone number to send a reminder.');
      return;
    }
    const message = encodeURIComponent(remindText.trim());
    const url = `https://wa.me/${phone}?text=${message}`;
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert('WhatsApp unavailable', 'WhatsApp is not available on this device.');
      return;
    }
    setRemindTarget(null);
    await Linking.openURL(url);
  }

  async function toggleHistory(rowId: string) {
    if (expandedSaleId === rowId) {
      setExpandedSaleId(null);
      return;
    }
    setExpandedSaleId(rowId);
    try {
      const history = await getPaymentsBySale(rowId);
      setPaymentHistory((prev) => ({ ...prev, [rowId]: history }));
    } catch (error) {
      Alert.alert('Load error', 'Unable to load payment history.');
      console.error(error);
    }
  }

  async function handleMarkPaid(rowId: string) {
    try {
      setMarkingPaidId(rowId);
      await markSalePaid(rowId, 'Cash');
      await loadDebts();
      const history = await getPaymentsBySale(rowId);
      setPaymentHistory((prev) => ({ ...prev, [rowId]: history }));
      setExpandedSaleId(rowId);
    } catch (error) {
      Alert.alert('Update failed', 'Unable to mark as paid.');
      console.error(error);
    } finally {
      setMarkingPaidId(null);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedText type="title">Debts</ThemedText>
          <ThemedText style={styles.caption}>
            Track who owes you and send gentle reminders.
          </ThemedText>
        </View>

        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <ThemedText style={styles.summaryLabel}>Total owed</ThemedText>
            <ThemedText style={styles.summaryValue}>{format(totalDue)}</ThemedText>
          </View>
          <View style={[styles.summaryCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <ThemedText style={styles.summaryLabel}>Due today</ThemedText>
            <ThemedText style={styles.summaryValue}>{format(dueToday)}</ThemedText>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">Debtor list</ThemedText>
          <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            {rows.length === 0 ? (
              <View style={styles.emptyState}>
                <ThemedText style={[styles.emptyText, { color: theme.muted }]}>
                  No outstanding debts.
                </ThemedText>
              </View>
            ) : (
              rows.map((row, index) => (
                <View
                  key={row.id}
                  style={[
                    styles.row,
                    index > 0 && [styles.rowDivider, { borderTopColor: theme.border }],
                  ]}>
                  <View style={styles.rowTop}>
                    <View style={styles.rowBody}>
                      <ThemedText style={styles.debtorName}>
                        {row.customer_name ?? `Sale #${row.sale_number}`}
                      </ThemedText>
                      <ThemedText style={styles.debtorMeta}>
                        Due {formatDueDate(row.due_date)}
                      </ThemedText>
                    </View>
                    <View style={styles.rowActions}>
                      <ThemedText style={styles.debtorAmount}>{format(row.balance_due)}</ThemedText>
                      <View style={styles.actionRow}>
                        <Pressable
                          onPress={() => handleRemind(row)}
                          style={[styles.remindButton, { backgroundColor: theme.primary }]}>
                          <ThemedText style={styles.remindText}>Remind</ThemedText>
                        </Pressable>
                        <Pressable
                          onPress={() => handleMarkPaid(row.id)}
                          disabled={markingPaidId === row.id}
                          style={[styles.payButton, { borderColor: theme.border }]}>
                          <ThemedText style={styles.payText}>
                            {markingPaidId === row.id ? 'Saving...' : 'Mark paid'}
                          </ThemedText>
                        </Pressable>
                        <Pressable
                          onPress={() => router.push({ pathname: '/record-payment', params: { saleId: row.id } })}
                          style={[styles.payButton, { borderColor: theme.border }]}>
                          <ThemedText style={styles.payText}>Record</ThemedText>
                        </Pressable>
                      </View>
                      <Pressable onPress={() => toggleHistory(row.id)}>
                        <ThemedText style={styles.historyLink}>
                          {expandedSaleId === row.id ? 'Hide payments' : 'View payments'}
                        </ThemedText>
                      </Pressable>
                    </View>
                  </View>
                  {expandedSaleId === row.id && (
                    <View
                      style={[
                        styles.historyBlock,
                        { borderColor: theme.border, backgroundColor: theme.surface },
                      ]}>
                      {paymentHistory[row.id]?.length ? (
                        paymentHistory[row.id].map((payment) => (
                          <View key={payment.id} style={styles.historyRow}>
                            <ThemedText style={styles.historyText}>
                              {format(payment.amount)} • {payment.method}
                            </ThemedText>
                            <ThemedText style={styles.historyMeta}>
                              {new Date(payment.created_at).toLocaleDateString('en-NG', {
                                day: '2-digit',
                                month: 'short',
                              })}
                            </ThemedText>
                          </View>
                        ))
                      ) : (
                        <ThemedText style={styles.historyMeta}>No payments recorded.</ThemedText>
                      )}
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      <Modal visible={!!remindTarget} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">Send reminder</ThemedText>
              <Pressable onPress={() => setRemindTarget(null)}>
                <ThemedText style={styles.modalClose}>Close</ThemedText>
              </Pressable>
            </View>
            <TextInput
              value={remindText}
              onChangeText={setRemindText}
              multiline
              style={[
                styles.modalInput,
                { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text },
              ]}
            />
            <Pressable
              onPress={sendReminder}
              style={[styles.modalButton, { backgroundColor: theme.primary }]}>
              <ThemedText style={styles.modalButtonText}>Send WhatsApp</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 24,
  },
  header: { gap: 8 },
  caption: { fontSize: 14, opacity: 0.7 },
  summaryRow: { flexDirection: 'row', gap: 12 },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 6,
  },
  summaryLabel: { fontSize: 12, opacity: 0.6 },
  summaryValue: { fontSize: 18 },
  section: { gap: 12 },
  card: {
    borderWidth: 1,
    borderRadius: 16,
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowTop: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  rowDivider: {
    borderTopWidth: 1,
  },
  rowBody: {
    flex: 1,
    gap: 4,
  },
  debtorName: { fontSize: 15 },
  debtorMeta: { fontSize: 12, opacity: 0.6 },
  rowActions: { alignItems: 'flex-end', gap: 6 },
  debtorAmount: { fontSize: 14 },
  actionRow: { flexDirection: 'row', gap: 8 },
  remindButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  remindText: { color: '#FFFFFF', fontSize: 12 },
  payButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  payText: { fontSize: 12 },
  historyLink: {
    fontSize: 11,
    color: '#0F6A3D',
    paddingTop: 4,
  },
  historyBlock: {
    marginTop: 8,
    padding: 10,
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    alignSelf: 'stretch',
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  historyText: {
    fontSize: 12,
  },
  historyMeta: {
    fontSize: 11,
    color: '#6B7280',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalClose: {
    fontSize: 12,
    color: '#0F6A3D',
  },
  modalInput: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  modalButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: { color: '#FFFFFF', fontSize: 14 },
  emptyState: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: { fontSize: 13 },
});
