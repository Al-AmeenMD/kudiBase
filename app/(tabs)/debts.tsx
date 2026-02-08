import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrency } from '@/hooks/use-currency';
import {
  getAppSetting,
  getBusinessProfile,
  getOutstandingSales,
  getPaymentsBySale,
  initDb,
  markSalePaid,
  setAppSetting,
} from '@/lib/db';
import { subscribeDbEvents } from '@/lib/db/events';
import { isPremium } from '@/lib/subscription';

import type { AutoReminderSettings, BusinessProfile, Debt, PaymentRecord } from '@/components/debts';
import {
  AutoReminderPrompt,
  AutoRemindersSection,
  DebtorCard,
  DebtsSummaryCard,
  ReminderModal,
  buildReminderMessage,
  getReminderKey,
  normalizePhone,
} from '@/components/debts';

export default function DebtsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { format } = useCurrency();
  const router = useRouter();

  // Data state
  const [premium, setPremium] = useState(false);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<Record<string, PaymentRecord[]>>({});

  // UI state
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);

  // Reminder modal state
  const [remindTarget, setRemindTarget] = useState<Debt | null>(null);
  const [remindText, setRemindText] = useState('');

  // Auto reminder state
  const [autoSettings, setAutoSettings] = useState<AutoReminderSettings>({
    enabled: false,
    frequency: 'daily',
    time: '09:00',
    weekday: 1,
  });
  const [autoPromptVisible, setAutoPromptVisible] = useState(false);
  const [autoTargets, setAutoTargets] = useState<Debt[]>([]);
  const loadDebtsRef = useRef(loadDebts);

  useEffect(() => {
    loadDebtsRef.current = loadDebts;
  }, [loadDebts]);

  const loadDebts = useCallback(async () => {
    await initDb();
    const [outstanding, profileRow] = await Promise.all([
      getOutstandingSales(),
      getBusinessProfile(),
    ]);
    setDebts(
      outstanding.map((row) => ({
        id: row.id,
        saleNumber: row.sale_number,
        customerName: row.customer_name,
        customerPhone: row.customer_phone,
        balanceDue: row.balance_due,
        dueDate: row.due_date,
        createdAt: row.created_at,
      }))
    );
    setPaymentHistory({});
    let premiumStatus = false;
    try {
      premiumStatus = await isPremium();
    } catch {
      premiumStatus = false;
    }
    setPremium(premiumStatus);
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
    isPremium()
      .then(setPremium)
      .catch(() => { });
  }, []);

  useEffect(() => {
    async function loadAutoSettings() {
      await initDb();
      const [enabled, frequency, time, weekday] = await Promise.all([
        getAppSetting('auto_reminders_enabled'),
        getAppSetting('auto_reminders_frequency'),
        getAppSetting('auto_reminders_time'),
        getAppSetting('auto_reminders_weekday'),
      ]);
      setAutoSettings({
        enabled: enabled === 'true',
        frequency: frequency === 'weekly' ? 'weekly' : 'daily',
        time: time === '13:00' || time === '18:00' ? time : '09:00',
        weekday: Number(weekday ?? 1) || 1,
      });
    }
    loadAutoSettings().catch(() => { });
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

  useEffect(() => {
    const unsubscribe = subscribeDbEvents((event) => {
      if (event !== 'sales') return;
      loadDebtsRef.current?.().catch(() => {});
    });
    return unsubscribe;
  }, []);

  // Computed values
  const totalDue = useMemo(() => debts.reduce((sum, d) => sum + d.balanceDue, 0), [debts]);
  const dueToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return debts.reduce((sum, d) => {
      if (!d.dueDate) return sum;
      const due = new Date(d.dueDate);
      due.setHours(0, 0, 0, 0);
      return due.getTime() === today.getTime() ? sum + d.balanceDue : sum;
    }, 0);
  }, [debts]);

  // Auto reminder prompt trigger
  useEffect(() => {
    async function maybePromptAutoReminders() {
      if (!premium || !autoSettings.enabled || debts.length === 0) return;

      const now = new Date();
      const [hour, minute] = autoSettings.time.split(':').map((v) => Number(v));
      const scheduled = new Date(now);
      scheduled.setHours(hour || 0, minute || 0, 0, 0);

      const dueItems = debts.filter((d) => {
        if (!d.dueDate) return true;
        const due = new Date(d.dueDate);
        due.setHours(0, 0, 0, 0);
        const todayDate = new Date(now);
        todayDate.setHours(0, 0, 0, 0);
        return due.getTime() <= todayDate.getTime();
      });

      if (!dueItems.length) return;
      if (autoSettings.frequency === 'weekly' && now.getDay() !== autoSettings.weekday) return;
      if (now.getTime() < scheduled.getTime()) return;

      const lastKey = await getAppSetting('auto_reminders_last_key');
      const nextKey = getReminderKey(now, autoSettings.frequency);
      if (lastKey === nextKey) return;

      await setAppSetting('auto_reminders_last_key', nextKey);
      setAutoTargets(dueItems);
      setAutoPromptVisible(true);
    }
    maybePromptAutoReminders().catch(() => { });
  }, [autoSettings, premium, debts]);

  // Handlers
  async function handleRemind(debt: Debt) {
    const phone = normalizePhone(debt.customerPhone);
    if (!phone) {
      Alert.alert('Missing phone', 'Add a phone number to send a reminder.');
      return;
    }
    const latestProfileRow = await getBusinessProfile();
    const latestProfile: BusinessProfile | null = latestProfileRow
      ? {
        businessName: latestProfileRow.business_name,
        ownerName: latestProfileRow.owner_name ?? undefined,
        bankName: latestProfileRow.bank_name ?? undefined,
        accountNumber: latestProfileRow.account_number ?? undefined,
        reminderTemplate: latestProfileRow.reminder_template ?? null,
      }
      : null;
    if (latestProfile) setProfile(latestProfile);
    setRemindTarget(debt);
    setRemindText(buildReminderMessage(debt, latestProfile ?? profile, format));
  }

  async function sendReminder() {
    if (!remindTarget) return;
    const phone = normalizePhone(remindTarget.customerPhone);
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

  async function sendAutoReminder(debt: Debt) {
    const phone = normalizePhone(debt.customerPhone);
    if (!phone) {
      Alert.alert('Missing phone', 'Add a phone number to send a reminder.');
      return;
    }
    const message = encodeURIComponent(buildReminderMessage(debt, profile, format));
    const url = `https://wa.me/${phone}?text=${message}`;
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert('WhatsApp unavailable', 'WhatsApp is not available on this device.');
      return;
    }
    await Linking.openURL(url);
  }

  async function handleToggleAutoReminders(next: boolean) {
    if (!premium && next) {
      router.push('/premium');
      return;
    }
    setAutoSettings((prev) => ({ ...prev, enabled: next }));
    await setAppSetting('auto_reminders_enabled', next ? 'true' : 'false');
  }

  async function handleSelectFrequency(next: 'daily' | 'weekly') {
    setAutoSettings((prev) => ({ ...prev, frequency: next }));
    await setAppSetting('auto_reminders_frequency', next);
  }

  async function handleSelectTime(next: '09:00' | '13:00' | '18:00') {
    setAutoSettings((prev) => ({ ...prev, time: next }));
    await setAppSetting('auto_reminders_time', next);
  }

  async function handleSelectWeekday(next: number) {
    setAutoSettings((prev) => ({ ...prev, weekday: next }));
    await setAppSetting('auto_reminders_weekday', String(next));
  }

  async function toggleHistory(debtId: string) {
    if (expandedSaleId === debtId) {
      setExpandedSaleId(null);
      return;
    }
    setExpandedSaleId(debtId);
    try {
      const history = await getPaymentsBySale(debtId);
      setPaymentHistory((prev) => ({
        ...prev,
        [debtId]: history.map((p) => ({
          id: p.id,
          amount: p.amount,
          method: p.method,
          note: p.note,
          createdAt: p.created_at,
        })),
      }));
    } catch (error) {
      Alert.alert('Load error', 'Unable to load payment history.');
      console.error(error);
    }
  }

  async function handleMarkPaid(debtId: string) {
    try {
      setMarkingPaidId(debtId);
      await markSalePaid(debtId, 'Cash');
      await loadDebts();
      const history = await getPaymentsBySale(debtId);
      setPaymentHistory((prev) => ({
        ...prev,
        [debtId]: history.map((p) => ({
          id: p.id,
          amount: p.amount,
          method: p.method,
          note: p.note,
          createdAt: p.created_at,
        })),
      }));
      setExpandedSaleId(debtId);
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
          <ThemedText style={styles.caption}>Track who owes you and send gentle reminders.</ThemedText>
        </View>

        <DebtsSummaryCard totalDue={totalDue} dueToday={dueToday} formatCurrency={format} />

        <AutoRemindersSection
          premium={premium}
          settings={autoSettings}
          onToggle={handleToggleAutoReminders}
          onSelectFrequency={handleSelectFrequency}
          onSelectTime={handleSelectTime}
          onSelectWeekday={handleSelectWeekday}
        />

        <View style={styles.section}>
          <ThemedText type="subtitle">Debtor list</ThemedText>
          <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            {debts.length === 0 ? (
              <View style={styles.emptyState}>
                <ThemedText style={[styles.emptyText, { color: theme.muted }]}>
                  No outstanding debts.
                </ThemedText>
              </View>
            ) : (
              debts.map((debt, index) => (
                <DebtorCard
                  key={debt.id}
                  debt={debt}
                  expanded={expandedSaleId === debt.id}
                  paymentHistory={paymentHistory[debt.id] ?? []}
                  markingPaid={markingPaidId === debt.id}
                  formatCurrency={format}
                  onRemind={() => handleRemind(debt)}
                  onMarkPaid={() => handleMarkPaid(debt.id)}
                  onToggleHistory={() => toggleHistory(debt.id)}
                  showDivider={index > 0}
                />
              ))
            )}
          </View>
        </View>
      </ScrollView>

      <AutoReminderPrompt
        visible={autoPromptVisible}
        targets={autoTargets}
        formatCurrency={format}
        onSendReminder={sendAutoReminder}
        onClose={() => setAutoPromptVisible(false)}
      />

      <ReminderModal
        visible={!!remindTarget}
        message={remindText}
        onChangeMessage={setRemindText}
        onClose={() => setRemindTarget(null)}
        onSend={sendReminder}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 24,
  },
  header: {
    gap: 8,
  },
  caption: {
    fontSize: 14,
    opacity: 0.7,
  },
  section: {
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
  },
  emptyState: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
  },
});
