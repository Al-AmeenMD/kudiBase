import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  clearAllData,
  exportData,
  getAppSetting,
  getBusinessProfile,
  importData,
  initDb,
  setAppSetting,
} from '@/lib/db';
import {
  cancelDailyReminder,
  requestNotificationPermission,
  scheduleDailyReminder,
} from '@/lib/notifications';

type ThemeMode = 'system' | 'light' | 'dark';
type Currency =
  | 'NGN'
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'CAD'
  | 'AUD'
  | 'NZD'
  | 'CHF'
  | 'JPY'
  | 'CNY'
  | 'INR'
  | 'SGD'
  | 'HKD'
  | 'KRW'
  | 'AED'
  | 'SAR'
  | 'ZAR'
  | 'KES'
  | 'GHS'
  | 'EGP'
  | 'MAD'
  | 'TND'
  | 'TRY'
  | 'ILS'
  | 'BRL'
  | 'MXN'
  | 'ARS'
  | 'CLP'
  | 'COP'
  | 'PEN'
  | 'PKR'
  | 'BDT'
  | 'VND'
  | 'IDR'
  | 'PHP'
  | 'THB'
  | 'MYR';

export default function SettingsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const router = useRouter();
  const [businessName, setBusinessName] = useState('Your business');
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const [currency, setCurrency] = useState<Currency>('NGN');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [currencyQuery, setCurrencyQuery] = useState('');
  const [themeModalVisible, setThemeModalVisible] = useState(false);

  const themeOptions: Array<{ value: ThemeMode; label: string }> = [
    { value: 'system', label: 'System default' },
    { value: 'light', label: 'Light mode' },
    { value: 'dark', label: 'Dark mode' },
  ];

  const currencies: Array<{ code: Currency; label: string }> = [
    { code: 'NGN', label: 'NGN (₦)' },
    { code: 'USD', label: 'USD ($)' },
    { code: 'EUR', label: 'EUR (€)' },
    { code: 'GBP', label: 'GBP (£)' },
    { code: 'CAD', label: 'CAD (C$)' },
    { code: 'AUD', label: 'AUD (A$)' },
    { code: 'JPY', label: 'JPY (¥)' },
    { code: 'CNY', label: 'CNY (¥)' },
    { code: 'INR', label: 'INR (₹)' },
    { code: 'AED', label: 'AED (د.إ)' },
    { code: 'ARS', label: 'ARS ($)' },
    { code: 'BDT', label: 'BDT (৳)' },
    { code: 'BRL', label: 'BRL (R$)' },
    { code: 'CHF', label: 'CHF (Fr)' },
    { code: 'CLP', label: 'CLP ($)' },
    { code: 'COP', label: 'COP ($)' },
    { code: 'EGP', label: 'EGP (E£)' },
    { code: 'GHS', label: 'GHS (₵)' },
    { code: 'HKD', label: 'HKD (HK$)' },
    { code: 'IDR', label: 'IDR (Rp)' },
    { code: 'ILS', label: 'ILS (₪)' },
    { code: 'KES', label: 'KES (KSh)' },
    { code: 'KRW', label: 'KRW (₩)' },
    { code: 'MAD', label: 'MAD (د.م.)' },
    { code: 'MXN', label: 'MXN (Mex$)' },
    { code: 'MYR', label: 'MYR (RM)' },
    { code: 'NZD', label: 'NZD (NZ$)' },
    { code: 'PEN', label: 'PEN (S/)' },
    { code: 'PHP', label: 'PHP (₱)' },
    { code: 'PKR', label: 'PKR (₨)' },
    { code: 'SAR', label: 'SAR (ر.س)' },
    { code: 'SGD', label: 'SGD (S$)' },
    { code: 'THB', label: 'THB (฿)' },
    { code: 'TND', label: 'TND (د.ت)' },
    { code: 'TRY', label: 'TRY (₺)' },
    { code: 'VND', label: 'VND (₫)' },
    { code: 'ZAR', label: 'ZAR (R)' },
  ];

  const filteredCurrencies = currencies.filter((item) => {
    if (!currencyQuery.trim()) {
      return true;
    }
    const query = currencyQuery.trim().toLowerCase();
    return item.code.toLowerCase().includes(query) || item.label.toLowerCase().includes(query);
  });

  const loadSettings = useCallback(async () => {
    await initDb();
    const [profile, storedTheme, storedCurrency, storedNotifications] = await Promise.all([
      getBusinessProfile(),
      getAppSetting('theme_mode'),
      getAppSetting('currency'),
      getAppSetting('notifications_enabled'),
    ]);
    setBusinessName(profile?.business_name ?? 'Your business');
    if (storedTheme === 'system' || storedTheme === 'light' || storedTheme === 'dark') {
      setThemeMode(storedTheme);
    }
    if (currencies.some((item) => item.code === storedCurrency)) {
      setCurrency(storedCurrency as Currency);
    }
    if (storedNotifications === 'true' || storedNotifications === 'false') {
      setNotificationsEnabled(storedNotifications === 'true');
    }
  }, []);

  useEffect(() => {
    loadSettings().catch((error) => {
      Alert.alert('Load error', 'Unable to load settings.');
      console.error(error);
    });
  }, [loadSettings]);

  useFocusEffect(
    useCallback(() => {
      loadSettings().catch((error) => {
        Alert.alert('Load error', 'Unable to refresh settings.');
        console.error(error);
      });
    }, [loadSettings])
  );

  async function updateTheme(mode: ThemeMode) {
    setThemeMode(mode);
    await setAppSetting('theme_mode', mode);
  }

  async function updateCurrency(value: Currency) {
    setCurrency(value);
    await setAppSetting('currency', value);
  }

  async function updateNotifications(next: boolean) {
    if (next) {
      try {
        setBusy(true);
        const granted = await requestNotificationPermission();
        if (!granted) {
          Alert.alert('Permission required', 'Enable notifications in system settings.');
          setNotificationsEnabled(false);
          await setAppSetting('notifications_enabled', 'false');
          return;
        }
        await scheduleDailyReminder();
        setNotificationsEnabled(true);
        await setAppSetting('notifications_enabled', 'true');
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to enable notifications.';
        Alert.alert('Notifications error', message);
        console.error(error);
      } finally {
        setBusy(false);
      }
      return;
    }

    try {
      setBusy(true);
      await cancelDailyReminder();
      setNotificationsEnabled(false);
      await setAppSetting('notifications_enabled', 'false');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to disable notifications.';
      Alert.alert('Notifications error', message);
      console.error(error);
    } finally {
      setBusy(false);
    }
  }

  async function handleExport() {
    try {
      setBusy(true);
      const payload = await exportData();
      const path = `${FileSystem.documentDirectory}kudibase-backup-${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(path, JSON.stringify(payload));
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, { dialogTitle: 'Export KudiBase data' });
      } else {
        Alert.alert('Exported', 'Backup saved in app storage.');
      }
    } catch (error) {
      Alert.alert('Export failed', 'Unable to export data.');
      console.error(error);
    } finally {
      setBusy(false);
    }
  }

  async function handleImport() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
      });
      if (result.canceled || !result.assets?.[0]) {
        return;
      }
      Alert.alert('Import data', 'This will replace existing data. Continue?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          style: 'destructive',
          onPress: async () => {
            try {
              setBusy(true);
              const file = result.assets[0];
              const content = await FileSystem.readAsStringAsync(file.uri);
              const payload = JSON.parse(content);
              await initDb();
              await importData(payload);
              Alert.alert('Import complete', 'Your data has been restored.');
            } catch (error) {
              Alert.alert('Import failed', 'Unable to import this file.');
              console.error(error);
            } finally {
              setBusy(false);
            }
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Import failed', 'Unable to import this file.');
      console.error(error);
    }
  }

  async function handleClearAllData() {
    Alert.alert('Clear all data?', 'This will delete all records on this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear data',
        style: 'destructive',
        onPress: async () => {
          try {
            setBusy(true);
            await cancelDailyReminder();
            await clearAllData();
            setBusinessName('Your business');
            setThemeMode('system');
            setCurrency('NGN');
            setNotificationsEnabled(false);
            Alert.alert('Cleared', 'All local data has been removed.');
          } catch (error) {
            Alert.alert('Failed', 'Unable to clear data.');
            console.error(error);
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  const appName = 'KudiBase';
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedText type="title">Settings</ThemedText>
          <ThemedText style={styles.caption}>Manage your business and app preferences.</ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">Profile</ThemedText>
          <View style={[styles.listCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <Pressable onPress={() => router.push('/profile')} style={styles.listRow}>
              <View style={[styles.iconBadge, { backgroundColor: theme.secondary }]}>
                <IconSymbol name="person.circle.fill" size={20} color={theme.primaryDeep} />
              </View>
              <View style={styles.rowContent}>
                <ThemedText style={styles.cardTitle}>Business profile</ThemedText>
                <ThemedText style={styles.cardMeta}>{businessName}</ThemedText>
              </View>
              <IconSymbol name="chevron.right" size={20} color={theme.muted} />
            </Pressable>
            <Pressable
              onPress={() => router.push('/reminder')}
              style={[styles.listRow, styles.rowDivider, { borderColor: theme.border }]}>
              <View style={[styles.iconBadge, { backgroundColor: theme.secondary }]}>
                <IconSymbol name="message.fill" size={20} color={theme.primaryDeep} />
              </View>
              <View style={styles.rowContent}>
                <ThemedText style={styles.cardTitle}>Reminder message</ThemedText>
                <ThemedText style={styles.cardMeta}>Edit WhatsApp reminder text</ThemedText>
              </View>
              <IconSymbol name="chevron.right" size={20} color={theme.muted} />
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">App Settings</ThemedText>
          <View style={[styles.listCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <View style={styles.listRow}>
              <View style={[styles.iconBadge, { backgroundColor: theme.secondary }]}>
                <IconSymbol name="bell.fill" size={20} color={theme.primaryDeep} />
              </View>
              <View style={styles.rowContent}>
                <ThemedText style={styles.cardTitle}>Notifications</ThemedText>
                <ThemedText style={styles.cardMeta}>
                  {notificationsEnabled ? 'Enabled' : 'Disabled'}
                </ThemedText>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={updateNotifications}
                disabled={busy}
                trackColor={{ true: theme.primary, false: theme.border }}
                thumbColor="#FFFFFF"
              />
            </View>
            <Pressable
              onPress={() => setThemeModalVisible(true)}
              style={[styles.listRow, styles.rowDivider, { borderColor: theme.border }]}>
              <View style={[styles.iconBadge, { backgroundColor: theme.secondary }]}>
                <IconSymbol name="moon.fill" size={20} color={theme.primaryDeep} />
              </View>
              <View style={styles.rowContent}>
                <ThemedText style={styles.cardTitle}>Theme</ThemedText>
                <ThemedText style={styles.cardMeta}>
                  {themeOptions.find((item) => item.value === themeMode)?.label ?? 'System default'}
                </ThemedText>
              </View>
              <IconSymbol name="chevron.right" size={20} color={theme.muted} />
            </Pressable>
            <Pressable
              onPress={() => setCurrencyModalVisible(true)}
              style={[styles.listRow, styles.rowDivider, { borderColor: theme.border }]}>
              <View style={[styles.iconBadge, { backgroundColor: theme.secondary }]}>
                <IconSymbol name="dollarsign.circle.fill" size={20} color={theme.primaryDeep} />
              </View>
              <View style={styles.rowContent}>
                <ThemedText style={styles.cardTitle}>Currency</ThemedText>
                <ThemedText style={styles.cardMeta}>{currency}</ThemedText>
              </View>
              <IconSymbol name="chevron.right" size={20} color={theme.muted} />
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">Data Management</ThemedText>
          <View style={[styles.listCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <Pressable onPress={() => router.push('/backup')} style={styles.listRow}>
              <View style={[styles.iconBadge, { backgroundColor: theme.secondary }]}>
                <IconSymbol name="cloud.fill" size={20} color={theme.primaryDeep} />
              </View>
              <View style={styles.rowContent}>
                <ThemedText style={styles.cardTitle}>Backup & sync</ThemedText>
                <ThemedText style={styles.cardMeta}>Local export and Drive sync</ThemedText>
              </View>
              <IconSymbol name="chevron.right" size={20} color={theme.muted} />
            </Pressable>
            <Pressable
              onPress={handleExport}
              disabled={busy}
              style={[styles.listRow, styles.rowDivider, { borderColor: theme.border }]}>
              <View style={[styles.iconBadge, { backgroundColor: theme.secondary }]}>
                <IconSymbol name="arrow.down.circle.fill" size={20} color={theme.primaryDeep} />
              </View>
              <View style={styles.rowContent}>
                <ThemedText style={styles.cardTitle}>Export data</ThemedText>
                <ThemedText style={styles.cardMeta}>Download your data file</ThemedText>
              </View>
              <IconSymbol name="chevron.right" size={20} color={theme.muted} />
            </Pressable>
            <Pressable
              onPress={handleImport}
              disabled={busy}
              style={[styles.listRow, styles.rowDivider, { borderColor: theme.border }]}>
              <View style={[styles.iconBadge, { backgroundColor: theme.secondary }]}>
                <IconSymbol name="arrow.up.circle.fill" size={20} color={theme.primaryDeep} />
              </View>
              <View style={styles.rowContent}>
                <ThemedText style={styles.cardTitle}>Import data</ThemedText>
                <ThemedText style={styles.cardMeta}>Restore from a backup file</ThemedText>
              </View>
              <IconSymbol name="chevron.right" size={20} color={theme.muted} />
            </Pressable>
            <Pressable
              onPress={handleClearAllData}
              disabled={busy}
              style={[styles.listRow, styles.rowDivider, { borderColor: theme.border }]}>
              <View style={[styles.iconBadge, { backgroundColor: theme.secondary }]}>
                <IconSymbol name="trash.fill" size={20} color={styles.destructiveText.color} />
              </View>
              <View style={styles.rowContent}>
                <ThemedText style={[styles.cardTitle, styles.destructiveText]}>Clear all data</ThemedText>
                <ThemedText style={styles.cardMeta}>Remove everything from this device</ThemedText>
              </View>
              <IconSymbol name="chevron.right" size={20} color={theme.muted} />
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">Security & Privacy</ThemedText>
          <View style={[styles.listCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <Pressable onPress={() => router.push('/privacy')} style={styles.listRow}>
              <View style={[styles.iconBadge, { backgroundColor: theme.secondary }]}>
                <IconSymbol name="shield.fill" size={20} color={theme.primaryDeep} />
              </View>
              <View style={styles.rowContent}>
                <ThemedText style={styles.cardTitle}>Privacy policy</ThemedText>
                <ThemedText style={styles.cardMeta}>Read our privacy policy</ThemedText>
              </View>
              <IconSymbol name="chevron.right" size={20} color={theme.muted} />
            </Pressable>
            <Pressable
              onPress={() => router.push('/help')}
              style={[styles.listRow, styles.rowDivider, { borderColor: theme.border }]}>
              <View style={[styles.iconBadge, { backgroundColor: theme.secondary }]}>
                <IconSymbol name="questionmark.circle.fill" size={20} color={theme.primaryDeep} />
              </View>
              <View style={styles.rowContent}>
                <ThemedText style={styles.cardTitle}>Help & support</ThemedText>
                <ThemedText style={styles.cardMeta}>FAQs, contact, and support</ThemedText>
              </View>
              <IconSymbol name="chevron.right" size={20} color={theme.muted} />
            </Pressable>
          </View>
        </View>

        <View style={styles.footer}>
          <ThemedText style={styles.footerTitle}>{appName}</ThemedText>
          <ThemedText style={styles.footerMeta}>Version {appVersion}</ThemedText>
        </View>
      </ScrollView>

      <Modal
        transparent
        animationType="fade"
        visible={currencyModalVisible}
        onRequestClose={() => setCurrencyModalVisible(false)}>
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setCurrencyModalVisible(false)}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={(event) => event.stopPropagation()}>
            <ThemedText type="subtitle">Select currency</ThemedText>
            <TextInput
              value={currencyQuery}
              onChangeText={setCurrencyQuery}
              placeholder="Search currency"
              placeholderTextColor={theme.muted}
              style={[
                styles.searchInput,
                { backgroundColor: theme.secondary, borderColor: theme.border, color: theme.text },
              ]}
            />
            <ScrollView
              style={[styles.modalList, { borderColor: theme.border }]}
              contentContainerStyle={styles.modalListContent}
              showsVerticalScrollIndicator={false}>
              {filteredCurrencies.map((item, index) => (
                <Pressable
                  key={item.code}
                  onPress={() => {
                    updateCurrency(item.code).catch(() => {});
                    setCurrencyQuery('');
                    setCurrencyModalVisible(false);
                  }}
                  style={[
                    styles.modalRow,
                    index > 0 ? { borderTopWidth: 1, borderColor: theme.border } : null,
                  ]}>
                  <ThemedText style={styles.cardTitle}>{item.label}</ThemedText>
                  {currency === item.code ? (
                    <IconSymbol name="checkmark.circle.fill" size={20} color={theme.primary} />
                  ) : null}
                </Pressable>
              ))}
              {filteredCurrencies.length === 0 ? (
                <View style={styles.emptyState}>
                  <ThemedText style={styles.cardMeta}>No matches found.</ThemedText>
                </View>
              ) : null}
            </ScrollView>
            <Pressable
              onPress={() => {
                setCurrencyQuery('');
                setCurrencyModalVisible(false);
              }}
              style={[styles.modalClose, { borderColor: theme.border }]}>
              <ThemedText style={styles.cardTitle}>Close</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        transparent
        animationType="fade"
        visible={themeModalVisible}
        onRequestClose={() => setThemeModalVisible(false)}>
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setThemeModalVisible(false)}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={(event) => event.stopPropagation()}>
            <ThemedText type="subtitle">Choose theme</ThemedText>
            <View style={[styles.modalList, { borderColor: theme.border }]}>
              {themeOptions.map((item, index) => (
                <Pressable
                  key={item.value}
                  onPress={() => {
                    updateTheme(item.value).catch(() => {});
                    setThemeModalVisible(false);
                  }}
                  style={[
                    styles.modalRow,
                    index > 0 ? { borderTopWidth: 1, borderColor: theme.border } : null,
                  ]}>
                  <ThemedText style={styles.cardTitle}>{item.label}</ThemedText>
                  {themeMode === item.value ? (
                    <IconSymbol name="checkmark.circle.fill" size={20} color={theme.primary} />
                  ) : null}
                </Pressable>
              ))}
            </View>
            <Pressable
              onPress={() => setThemeModalVisible(false)}
              style={[styles.modalClose, { borderColor: theme.border }]}>
              <ThemedText style={styles.cardTitle}>Close</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
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
  section: { gap: 12 },
  listCard: {
    borderWidth: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowDivider: {
    borderTopWidth: 1,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: {
    flex: 1,
    gap: 4,
  },
  cardTitle: { fontSize: 14 },
  cardMeta: { fontSize: 12, opacity: 0.6 },
  cardLink: { fontSize: 12, color: '#0F6A3D' },
  destructiveText: { color: '#C43D3D' },
  modalBackdrop: {
    flex: 1,
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
  },
  modalCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 16,
  },
  modalList: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
    maxHeight: 260,
  },
  modalListContent: {
    paddingHorizontal: 0,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  emptyState: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  modalClose: {
    borderWidth: 1,
    borderRadius: 999,
    alignItems: 'center',
    paddingVertical: 10,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 16,
    gap: 6,
  },
  footerTitle: { fontSize: 14 },
  footerMeta: { fontSize: 12, opacity: 0.6 },
});
