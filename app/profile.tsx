import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getBusinessProfile, initDb, upsertBusinessProfile } from '@/lib/db';

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
      Alert.alert('Load error', 'Unable to load profile.');
      console.error(error);
    });
  }, []);

  async function handlePickLogo() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow photo access to choose a logo.');
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
      Alert.alert('Logo error', 'Unable to select a logo.');
      console.error(error);
    }
  }

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
        phone: phone.trim(),
        address: address.trim(),
        email: email.trim(),
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        logoPath: logoUri ?? undefined,
      });
      Alert.alert('Saved', 'Profile updated.');
    } catch (error) {
      Alert.alert('Save failed', 'Unable to save profile.');
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
          <ThemedText type="subtitle">Profile</ThemedText>
          <View style={styles.headerSpacer} />
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
