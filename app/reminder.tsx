import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrency } from '@/hooks/use-currency';
import { getBusinessProfile, initDb, upsertBusinessProfile } from '@/lib/db';

const defaultTemplate =
  'Hello {customerName}, this is {businessName}. You have an outstanding balance of {amount}. Please pay to {accountName} ({bankName} {accountNumber}). Thank you.';

export default function ReminderScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { format } = useCurrency();
  const [template, setTemplate] = useState(defaultTemplate);
  const [profile, setProfile] = useState<{
    businessName: string;
    ownerName?: string;
    bankName?: string;
    accountNumber?: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      await initDb();
      const row = await getBusinessProfile();
      if (!row) {
        setProfile(null);
        setTemplate(defaultTemplate);
        return;
      }
      setProfile({
        businessName: row.business_name,
        ownerName: row.owner_name ?? undefined,
        bankName: row.bank_name ?? undefined,
        accountNumber: row.account_number ?? undefined,
      });
      setTemplate(row.reminder_template ?? defaultTemplate);
    }
    load().catch((error) => {
      Alert.alert('Load error', 'Unable to load reminder template.');
      console.error(error);
    });
  }, []);

  const preview = useMemo(() => {
    const sampleValues: Record<string, string> = {
      customerName: 'Shehu Musa',
      businessName: profile?.businessName ?? 'Your business',
      amount: format(65000),
      accountName: profile?.ownerName ?? 'Account name',
      bankName: profile?.bankName ?? 'Bank',
      accountNumber: profile?.accountNumber ?? '0000000000',
    };
    return template
      .replaceAll('{customerName}', sampleValues.customerName)
      .replaceAll('{businessName}', sampleValues.businessName)
      .replaceAll('{amount}', sampleValues.amount)
      .replaceAll('{accountName}', sampleValues.accountName)
      .replaceAll('{bankName}', sampleValues.bankName)
      .replaceAll('{accountNumber}', sampleValues.accountNumber);
  }, [profile, template]);

  async function handleSave() {
    if (!profile?.businessName?.trim()) {
      Alert.alert('Profile required', 'Set your business name first.');
      router.push('/profile');
      return;
    }
    try {
      setSaving(true);
      await initDb();
      await upsertBusinessProfile({
        businessName: profile.businessName.trim(),
        ownerName: profile.ownerName,
        bankName: profile.bankName,
        accountNumber: profile.accountNumber,
        reminderTemplate: template.trim(),
      });
      Alert.alert('Saved', 'Reminder message updated.');
    } catch (error) {
      Alert.alert('Save failed', 'Unable to save reminder message.');
      console.error(error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ThemedText style={styles.backLabel}>Back</ThemedText>
          </Pressable>
          <ThemedText type="subtitle">Reminder message</ThemedText>
          <View style={styles.headerSpacer} />
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <ThemedText style={styles.sectionTitle}>WhatsApp reminder template</ThemedText>
          <TextInput
            value={template}
            onChangeText={setTemplate}
            multiline
            placeholder={defaultTemplate}
            placeholderTextColor={theme.muted}
            style={[
              styles.textArea,
              { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text },
            ]}
          />
          <ThemedText style={styles.hint}>
            Use placeholders: {`{customerName}`} {`{amount}`} {`{businessName}`} {`{accountName}`}{' '}
            {`{bankName}`} {`{accountNumber}`}
          </ThemedText>
          <View style={[styles.previewBox, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
            <ThemedText style={styles.previewLabel}>Preview</ThemedText>
            <ThemedText style={styles.previewText}>{preview}</ThemedText>
          </View>
        </View>

        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={[styles.primaryButton, { backgroundColor: theme.primary }]}>
          <ThemedText style={styles.primaryButtonText}>
            {saving ? 'Saving...' : 'Save reminder'}
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
    paddingBottom: 8,
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
  headerSpacer: {
    width: 56,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
  },
  textArea: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 11,
    color: '#6B7280',
  },
  previewBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  previewLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    color: '#6B7280',
  },
  previewText: {
    fontSize: 12,
    color: '#1E1E1E',
  },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16 },
});
