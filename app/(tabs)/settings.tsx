import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getBusinessProfile, initDb, upsertBusinessProfile } from '@/lib/db';

const defaultTemplate =
  'Hello {customerName}, this is {businessName}. You have an outstanding balance of {amount}. Please pay to {accountName} ({bankName} {accountNumber}). Thank you.';

export default function SettingsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [businessName, setBusinessName] = useState('KudiBase Store');
  const [ownerName, setOwnerName] = useState('Amina Bello');
  const [bankName, setBankName] = useState('GTBank');
  const [accountNumber, setAccountNumber] = useState('0123456789');
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState(defaultTemplate);

  const preview = useMemo(() => {
    return template
      .replace('{customerName}', 'Chika Stores')
      .replace('{businessName}', businessName || 'Your business')
      .replace('{amount}', '₦12,500')
      .replace('{accountName}', ownerName || 'Account name')
      .replace('{bankName}', bankName || 'Bank')
      .replace('{accountNumber}', accountNumber || '0000000000');
  }, [template, businessName, ownerName, bankName, accountNumber]);

  useEffect(() => {
    async function load() {
      await initDb();
      const profile = await getBusinessProfile();
      if (profile) {
        setBusinessName(profile.business_name);
        setOwnerName(profile.owner_name ?? '');
        setBankName(profile.bank_name ?? '');
        setAccountNumber(profile.account_number ?? '');
        if (profile.reminder_template) {
          setTemplate(profile.reminder_template);
        }
      }
    }
    load().catch((error) => {
      Alert.alert('Load error', 'Unable to load business profile.');
      console.error(error);
    });
  }, []);

  async function handleSave() {
    if (!businessName.trim()) {
      Alert.alert('Business name required', 'Enter your business name.');
      return;
    }
    try {
      setSaving(true);
      await initDb();
      await upsertBusinessProfile({
        businessName: businessName.trim(),
        ownerName: ownerName.trim(),
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        reminderTemplate: template.trim(),
      });
      Alert.alert('Saved', 'Business profile updated.');
    } catch (error) {
      Alert.alert('Save failed', 'Unable to save profile.');
      console.error(error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedText type="title">Settings</ThemedText>
          <ThemedText style={styles.caption}>
            Customize receipts and WhatsApp reminders.
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">Business details</ThemedText>
          <View
            style={[
              styles.card,
              { borderColor: theme.border, backgroundColor: theme.surface },
            ]}>
            <InputRow
              label="Business name"
              value={businessName}
              onChangeText={setBusinessName}
              placeholder="Your shop name"
            />
            <InputRow
              label="Owner name"
              value={ownerName}
              onChangeText={setOwnerName}
              placeholder="Account name"
            />
            <InputRow
              label="Bank name"
              value={bankName}
              onChangeText={setBankName}
              placeholder="Bank"
            />
            <InputRow
              label="Account number"
              value={accountNumber}
              onChangeText={setAccountNumber}
              placeholder="0000000000"
              keyboardType="number-pad"
            />
          </View>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}>
            <ThemedText style={styles.primaryButtonText}>
              {saving ? 'Saving...' : 'Save profile'}
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">WhatsApp reminder template</ThemedText>
          <View
            style={[
              styles.card,
              { borderColor: theme.border, backgroundColor: theme.surface },
            ]}>
            <View style={styles.inputBlock}>
              <ThemedText style={styles.inputLabel}>Template</ThemedText>
              <TextInput
                value={template}
                onChangeText={setTemplate}
                multiline
                style={[
                  styles.textInput,
                  styles.templateInput,
                  { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text },
                ]}
                placeholder="Write your reminder message"
                placeholderTextColor={theme.muted}
              />
            </View>
            <View style={styles.previewBlock}>
              <ThemedText style={styles.inputLabel}>Preview</ThemedText>
              <View style={[styles.previewCard, { backgroundColor: theme.secondary }]}>
                <ThemedText style={[styles.previewText, { color: theme.onSecondary }]}>
                  {preview}
                </ThemedText>
              </View>
            </View>
            <View style={styles.hintRow}>
              <ThemedText style={styles.hintText}>
                Available placeholders: {`{customerName}`} {`{amount}`} {`{businessName}`}{' '}
                {`{accountName}`} {`{bankName}`} {`{accountNumber}`}
              </ThemedText>
            </View>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

function InputRow({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'number-pad';
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  return (
    <View style={styles.inputBlock}>
      <ThemedText style={styles.inputLabel}>{label}</ThemedText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={[styles.textInput, { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text }]}
        placeholder={placeholder}
        placeholderTextColor={theme.muted}
        keyboardType={keyboardType}
      />
    </View>
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
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  inputBlock: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'Sora-Regular',
  },
  templateInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  previewBlock: { gap: 6 },
  previewCard: {
    borderRadius: 12,
    padding: 12,
  },
  previewText: {
    fontSize: 13,
  },
  hintRow: {
    paddingTop: 4,
  },
  hintText: {
    fontSize: 11,
    opacity: 0.6,
  },
  primaryButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14 },
});
