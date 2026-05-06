import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getBusinessProfile, initDb, setAppSetting, upsertBusinessProfile } from '@/lib/db';
import { supabase } from '@/lib/supabase';

type Mode = 'register' | 'login';

function OnboardingScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const router = useRouter();
  const { source } = useLocalSearchParams<{ source?: string }>();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<Mode>('register');
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      await initDb();
      const profile = await getBusinessProfile();
      if (!profile) {
        return;
      }
      setBusinessName(profile.business_name);
      setOwnerName(profile.owner_name ?? '');
      setPhone(profile.phone ?? '');
      setAddress(profile.address ?? '');
      setEmail(profile.email ?? '');
      setBankName(profile.bank_name ?? '');
      setAccountNumber(profile.account_number ?? '');
    }
    load().catch((error) => {
      Alert.alert('Load error', 'Unable to load your profile.');
      console.error(error);
    });
  }, []);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }

    try {
      setSaving(true);

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (signInError) {
        Alert.alert('Login failed', signInError.message || 'Invalid email or password.');
        return;
      }

      if (data.user) {
        const meta = data.user.user_metadata;
        // Restore the user's profile from Supabase metadata
        await initDb();
        await upsertBusinessProfile({
          businessName: meta?.business_name ?? 'My Business',
          ownerName: meta?.owner_name ?? '',
          phone: meta?.phone ?? '',
          address: meta?.address ?? '',
          email: data.user.email ?? email.trim(),
          bankName: meta?.bank_name ?? '',
          accountNumber: meta?.account_number ?? '',
        });
        await setAppSetting('onboarding_complete', 'true');

        Alert.alert('Welcome back!', `Logged in as ${data.user.email}`);
        router.replace('/');
      }
    } catch (error) {
      Alert.alert('Login failed', 'Something went wrong. Please try again.');
      console.error(error);
    } finally {
      setSaving(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      Alert.alert('Enter your email', 'Please type your email address first, then tap "Forgot password?" again.');
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) {
        Alert.alert('Reset failed', error.message || 'Unable to send reset email.');
        return;
      }
      Alert.alert(
        'Check your email',
        `We sent a password reset link to ${email.trim()}. Follow the link to reset your password, then come back and log in.`
      );
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again later.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRegister(skipProfile: boolean) {
    try {
      setSaving(true);
      await initDb();
      if (!skipProfile || source !== 'settings') {
        if (!businessName.trim()) {
          Alert.alert('Business name required', 'Enter your business name to continue.');
          return;
        }
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
          Alert.alert('Invalid email', 'A valid email is required to register your account.');
          return;
        }

        if (source !== 'settings') {
          if (!password.trim() || password.length < 6) {
            Alert.alert('Password required', 'Please enter a secure password (at least 6 characters).');
            return;
          }

          const { error: signUpError } = await supabase.auth.signUp({
            email: email.trim(),
            password: password.trim(),
            options: {
              data: {
                business_name: businessName.trim(),
                owner_name: ownerName.trim(),
                phone: phone.trim(),
                address: address.trim(),
                bank_name: bankName.trim(),
                account_number: accountNumber.trim(),
              }
            }
          });

          if (signUpError) {
            Alert.alert('Registration failed', signUpError.message || 'Please check your internet connection.');
            return;
          }
        }
        await upsertBusinessProfile({
          businessName: businessName.trim(),
          ownerName: ownerName.trim(),
          phone: phone.trim(),
          address: address.trim(),
          email: email.trim(),
          bankName: bankName.trim(),
          accountNumber: accountNumber.trim(),
        });
      }
      await setAppSetting('onboarding_complete', 'true');
      if (source === 'settings') {
        router.back();
      } else {
        router.replace('/');
      }
    } catch (error) {
      Alert.alert('Save failed', 'Unable to save your details.');
      console.error(error);
    } finally {
      setSaving(false);
    }
  }

  const isSettingsMode = source === 'settings';

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? Math.max(insets.top, 12) : 0}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.headerRow}>
            <View>
              <ThemedText type="subtitle">
                {isSettingsMode
                  ? 'Edit Profile'
                  : mode === 'register'
                    ? 'Welcome to KudiBase'
                    : 'Welcome back'}
              </ThemedText>
              <ThemedText style={[styles.subtitle, { color: theme.muted }]}>
                {isSettingsMode
                  ? 'Update your business details.'
                  : mode === 'register'
                    ? 'Set up your business to get started.'
                    : 'Log in to restore your account.'}
              </ThemedText>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={styles.form}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">

            {/* Login mode: just email + password */}
            {mode === 'login' && !isSettingsMode && (
              <>
                <InputRow
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  placeholder="hello@yourshop.com"
                />
                <InputRow
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Your password"
                  secureTextEntry={true}
                />
                <Pressable onPress={handleForgotPassword} disabled={saving}>
                  <ThemedText style={[styles.forgotText, { color: theme.primary }]}>
                    Forgot password?
                  </ThemedText>
                </Pressable>
              </>
            )}

            {/* Register mode: full form */}
            {(mode === 'register' || isSettingsMode) && (
              <>
                <InputRow
                  label="Business name"
                  value={businessName}
                  onChangeText={setBusinessName}
                  placeholder="KudiBase Store"
                />
                <InputRow
                  label="Owner name"
                  value={ownerName}
                  onChangeText={setOwnerName}
                  placeholder="Ahmad Yusuf"
                />
                <InputRow
                  label="Phone (optional)"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholder="08030000000"
                />
                <InputRow
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  placeholder="hello@yourshop.com"
                />
                {!isSettingsMode && (
                  <InputRow
                    label="Password"
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Secure password (min 6 chars)"
                    secureTextEntry={true}
                  />
                )}
                <InputRow
                  label="Address (optional)"
                  value={address}
                  onChangeText={setAddress}
                  placeholder="12 Palm Street, Lagos"
                />
                <InputRow
                  label="Bank name (optional)"
                  value={bankName}
                  onChangeText={setBankName}
                  placeholder="Access Bank"
                />
                <InputRow
                  label="Account number (optional)"
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                  keyboardType="number-pad"
                  placeholder="0123456789"
                />

                <View style={styles.helperCard}>
                  <ThemedText style={[styles.helperTitle, { color: theme.text }]}>You can update anytime</ThemedText>
                  <ThemedText style={[styles.helperText, { color: theme.muted }]}>
                    Edit these details later in the Profile screen.
                  </ThemedText>
                </View>
              </>
            )}
          </ScrollView>

          <View style={styles.actions}>
            {isSettingsMode && (
              <Pressable
                onPress={() => handleRegister(true)}
                disabled={saving}
                style={[styles.secondaryButton, { borderColor: theme.border }]}>
                <ThemedText style={[styles.secondaryText, { color: theme.text }]}>Skip for now</ThemedText>
              </Pressable>
            )}
            <Pressable
              onPress={() => {
                if (mode === 'login') {
                  handleLogin();
                } else {
                  handleRegister(false);
                }
              }}
              disabled={saving}
              style={[styles.primaryButton, { backgroundColor: theme.primary }]}>
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <ThemedText style={styles.primaryText}>
                  {isSettingsMode
                    ? 'Save & continue'
                    : mode === 'register'
                      ? 'Create account'
                      : 'Log in'}
                </ThemedText>
              )}
            </Pressable>
          </View>

          {/* Mode toggle — only show during initial onboarding */}
          {!isSettingsMode && (
            <Pressable onPress={() => setMode(mode === 'register' ? 'login' : 'register')} style={styles.toggleRow}>
              <ThemedText style={[styles.toggleText, { color: theme.muted }]}>
                {mode === 'register'
                  ? 'Already have an account? '
                  : 'New here? '}
              </ThemedText>
              <ThemedText style={[styles.toggleLink, { color: theme.primary }]}>
                {mode === 'register' ? 'Log in' : 'Register'}
              </ThemedText>
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

function InputRow({
  label,
  value,
  onChangeText,
  keyboardType,
  placeholder,
  secureTextEntry,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: 'default' | 'phone-pad' | 'email-address' | 'number-pad';
  placeholder?: string;
  secureTextEntry?: boolean;
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
        secureTextEntry={secureTextEntry}
        placeholder={placeholder ?? label}
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
  overlay: {
    flex: 1,
    padding: 20,
    paddingTop: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    maxHeight: '90%',
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    alignItems: 'center',
  },
  subtitle: { fontSize: 12, marginTop: 4 },
  form: {
    gap: 12,
    paddingBottom: 6,
  },
  inputBlock: {
    gap: 6,
  },
  inputLabel: { fontSize: 12, opacity: 0.7 },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  helperCard: {
    borderRadius: 12,
    padding: 12,
    backgroundColor: 'rgba(15, 106, 61, 0.08)',
    gap: 4,
  },
  helperTitle: { fontSize: 12, fontWeight: '600' },
  helperText: { fontSize: 12 },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  primaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  secondaryButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryText: { fontSize: 14 },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 4,
  },
  toggleText: {
    fontSize: 13,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'right',
    marginTop: -4,
  },
  toggleLink: {
    fontSize: 13,
    fontWeight: '700',
  },
});

export default OnboardingScreen;
