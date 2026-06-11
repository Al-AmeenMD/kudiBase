import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getBusinessProfile, initDb, upsertBusinessProfile } from '@/lib/db';

type NoticeVariant = 'default' | 'destructive' | 'success';
type NoticeState = {
  title: string;
  message: string;
  variant: NoticeVariant;
  onDone?: () => void;
};

export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<NoticeState | null>(null);

  function showNotice(
    title: string,
    message: string,
    variant: NoticeVariant = 'destructive',
    onDone?: () => void
  ) {
    setNotice({ title, message, variant, onDone });
  }

  function closeNotice() {
    const onDone = notice?.onDone;
    setNotice(null);
    onDone?.();
  }

  useEffect(() => {
    async function load() {
      await initDb();
      const profile = await getBusinessProfile();
      if (profile) {
        setBusinessName(profile.business_name);
        setOwnerName(profile.owner_name ?? '');
        setPhone(profile.phone ?? '');
        setAddress(profile.address ?? '');
        setEmail(profile.email ?? '');
        setBankName(profile.bank_name ?? '');
        setAccountNumber(profile.account_number ?? '');
        setLogoUri(profile.logo_path ?? null);
      }
    }
    load().catch((error) => {
      showNotice('Load error', 'Unable to load profile.');
      console.error(error);
    });
  }, []);

  async function handlePickLogo() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showNotice('Permission needed', 'Allow photo access to choose a logo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]) {
        return;
      }
      setLogoUri(result.assets[0].uri);
    } catch (error) {
      showNotice('Logo error', 'Unable to select a logo.');
      console.error(error);
    }
  }

  async function handleSave() {
    if (!businessName.trim()) {
      showNotice('Business name required', 'Enter your business name.');
      return;
    }
    try {
      setSaving(true);
      await initDb();
      await upsertBusinessProfile({
        businessName: businessName.trim(),
        ownerName: ownerName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        email: email.trim(),
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        logoPath: logoUri ?? undefined,
      });
      showNotice('Saved', 'Profile updated.', 'success', () => router.back());
    } catch (error) {
      showNotice('Save failed', 'Unable to save profile.');
      console.error(error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top - 8, 0) }]}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backButton, { borderColor: theme.border }]}>
            <IconSymbol name="chevron.left" size={20} color={theme.primaryDeep} />
          </Pressable>
          <ThemedText type="subtitle">Profile</ThemedText>
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
          <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <ThemedText style={styles.sectionTitle}>Logo</ThemedText>
            <View style={styles.logoRow}>
              {logoUri ? (
                <Image source={{ uri: logoUri }} style={styles.logoPreview} />
              ) : (
                <View style={[styles.logoFallback, { backgroundColor: theme.secondary }]}>
                  <ThemedText style={styles.logoFallbackText}>
                    {(businessName.trim() || 'K')[0]?.toUpperCase()}
                  </ThemedText>
                </View>
              )}
              <View style={styles.logoActions}>
                <Pressable
                  onPress={handlePickLogo}
                  style={[styles.secondaryButton, { borderColor: theme.border }]}>
                  <ThemedText style={styles.secondaryButtonText}>Change logo</ThemedText>
                </Pressable>
                {logoUri ? (
                  <Pressable
                    onPress={() => setLogoUri(null)}
                    style={[styles.secondaryButton, { borderColor: theme.border }]}>
                    <ThemedText style={styles.secondaryButtonText}>Remove</ThemedText>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>

          <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <InputRow label="Business name" value={businessName} onChangeText={setBusinessName} />
            <InputRow label="Owner name" value={ownerName} onChangeText={setOwnerName} />
            <InputRow label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <InputRow label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
            <InputRow label="Address" value={address} onChangeText={setAddress} />
            <InputRow label="Bank name" value={bankName} onChangeText={setBankName} />
            <InputRow
              label="Account number"
              value={accountNumber}
              onChangeText={setAccountNumber}
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
        </ScrollView>
      </KeyboardAvoidingView>
      <ConfirmDialog
        visible={notice !== null}
        title={notice?.title ?? ''}
        message={notice?.message ?? ''}
        confirmLabel="OK"
        iconName={notice?.variant === 'success' ? 'checkmark.circle.fill' : 'questionmark.circle.fill'}
        variant={notice?.variant ?? 'default'}
        showCancel={false}
        onCancel={closeNotice}
        onConfirm={closeNotice}
      />
    </ThemedView>
  );
}

function InputRow({
  label,
  value,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: 'default' | 'phone-pad' | 'email-address' | 'number-pad';
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  return (
    <View style={styles.inputBlock}>
      <ThemedText style={styles.inputLabel}>{label}</ThemedText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={label}
        placeholderTextColor={theme.muted}
        style={[
          styles.textInput,
          { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardWrap: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
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
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  logoPreview: {
    width: 72,
    height: 72,
    borderRadius: 16,
  },
  logoFallback: {
    width: 72,
    height: 72,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoFallbackText: {
    fontSize: 28,
    color: '#0B4F2F',
  },
  logoActions: {
    flex: 1,
    gap: 10,
  },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 13,
    color: '#0F6A3D',
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
  sectionTitle: {
    fontSize: 13,
  },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16 },
});
