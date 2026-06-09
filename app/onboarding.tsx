import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getBusinessProfile, initDb, setAppSetting, upsertBusinessProfile } from '@/lib/db';
import { supabase } from '@/lib/supabase';

type Mode = 'register' | 'login';
type RegisterStep = 'account' | 'business';

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function OnboardingScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const router = useRouter();
  const { source } = useLocalSearchParams<{ source?: string }>();
  const insets = useSafeAreaInsets();
  const isSettingsMode = source === 'settings';

  const [mode, setMode] = useState<Mode>('register');
  const [registerStep, setRegisterStep] = useState<RegisterStep>('account');
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

  function switchMode(next: Mode) {
    setMode(next);
    setRegisterStep('account');
  }

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
      Alert.alert('Enter your email', 'Type your email address first, then tap "Forgot password?" again.');
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
        `We sent a password reset link to ${email.trim()}. Follow the link, then come back and log in.`
      );
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again later.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateAccount() {
    const nextEmail = email.trim();
    const nextPassword = password.trim();

    if (!isValidEmail(nextEmail)) {
      Alert.alert('Invalid email', 'Enter a valid email address to create your account.');
      return;
    }
    if (nextPassword.length < 6) {
      Alert.alert('Password required', 'Use a password with at least 6 characters.');
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase.auth.signUp({
        email: nextEmail,
        password: nextPassword,
      });

      if (error) {
        Alert.alert('Registration failed', error.message || 'Please check your internet connection.');
        return;
      }

      setRegisterStep('business');
    } catch (error) {
      Alert.alert('Registration failed', 'Something went wrong. Please try again.');
      console.error(error);
    } finally {
      setSaving(false);
    }
  }

  async function syncBusinessMetadata() {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) {
      return;
    }

    await supabase.auth.updateUser({
      data: {
        business_name: businessName.trim(),
        owner_name: ownerName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        bank_name: bankName.trim(),
        account_number: accountNumber.trim(),
      },
    });
  }

  async function handleSaveBusiness(skipProfile: boolean = false) {
    try {
      setSaving(true);
      await initDb();

      if (!skipProfile) {
        if (!businessName.trim()) {
          Alert.alert('Business name required', 'Enter your business name to continue.');
          return;
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

        if (!isSettingsMode) {
          await syncBusinessMetadata().catch((error) => {
            console.warn('Could not sync business metadata:', error);
          });
        }
      }

      await setAppSetting('onboarding_complete', 'true');
      if (isSettingsMode) {
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

  const isRegisterAccount = !isSettingsMode && mode === 'register' && registerStep === 'account';
  const isRegisterBusiness = isSettingsMode || (mode === 'register' && registerStep === 'business');
  const title = isSettingsMode
    ? 'Edit Profile'
    : mode === 'login'
      ? 'Welcome back'
      : registerStep === 'account'
        ? 'Create your account'
        : 'Set up your shop';
  const subtitle = isSettingsMode
    ? 'Update your business details.'
    : mode === 'login'
      ? 'Log in to restore your account.'
      : registerStep === 'account'
        ? 'Start with your login details.'
        : 'Account created. Now add your business details.';

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? Math.max(insets.top, 12) : 0}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <ThemedText type="subtitle">{title}</ThemedText>
              <ThemedText style={[styles.subtitle, { color: theme.muted }]}>{subtitle}</ThemedText>
            </View>
          </View>

          {!isSettingsMode && mode === 'register' ? (
            <View style={styles.progressRow}>
              <StepPill label="Account" active={registerStep === 'account'} complete={registerStep === 'business'} />
              <View style={[styles.progressLine, { backgroundColor: theme.border }]} />
              <StepPill label="Business" active={registerStep === 'business'} complete={false} />
            </View>
          ) : null}

          <ScrollView
            contentContainerStyle={styles.form}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            {mode === 'login' && !isSettingsMode ? (
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
                  secureTextEntry
                />
                <Pressable onPress={handleForgotPassword} disabled={saving}>
                  <ThemedText style={[styles.forgotText, { color: theme.primary }]}>Forgot password?</ThemedText>
                </Pressable>
              </>
            ) : null}

            {isRegisterAccount ? (
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
                  placeholder="Secure password (min 6 chars)"
                  secureTextEntry
                />
                <View style={[styles.helperCard, { backgroundColor: colorScheme === 'dark' ? '#16251D' : '#EEF8F1' }]}>
                  <ThemedText style={[styles.helperTitle, { color: theme.text }]}>Your account comes first</ThemedText>
                  <ThemedText style={[styles.helperText, { color: theme.muted }]}>
                    After this, you will add the shop details customers see on receipts and reminders.
                  </ThemedText>
                </View>
              </>
            ) : null}

            {isRegisterBusiness ? (
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
                <View style={[styles.helperCard, { backgroundColor: colorScheme === 'dark' ? '#16251D' : '#EEF8F1' }]}>
                  <ThemedText style={[styles.helperTitle, { color: theme.text }]}>You can update anytime</ThemedText>
                  <ThemedText style={[styles.helperText, { color: theme.muted }]}>
                    Edit these details later in the Profile screen.
                  </ThemedText>
                </View>
              </>
            ) : null}
          </ScrollView>

          <View style={styles.actions}>
            {isSettingsMode ? (
              <Pressable
                onPress={() => handleSaveBusiness(true)}
                disabled={saving}
                style={[styles.secondaryButton, { borderColor: theme.border }]}>
                <ThemedText style={[styles.secondaryText, { color: theme.text }]}>Skip for now</ThemedText>
              </Pressable>
            ) : null}

            <Pressable
              onPress={() => {
                if (mode === 'login') {
                  handleLogin();
                  return;
                }
                if (registerStep === 'account' && !isSettingsMode) {
                  handleCreateAccount();
                  return;
                }
                handleSaveBusiness(false);
              }}
              disabled={saving}
              style={[styles.primaryButton, { backgroundColor: theme.primary }]}>
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <ThemedText style={styles.primaryText}>
                  {isSettingsMode
                    ? 'Save details'
                    : mode === 'login'
                      ? 'Log in'
                      : registerStep === 'account'
                        ? 'Create account'
                        : 'Finish setup'}
                </ThemedText>
              )}
            </Pressable>
          </View>

          {!isSettingsMode ? (
            <Pressable
              onPress={() => switchMode(mode === 'register' ? 'login' : 'register')}
              style={styles.toggleRow}>
              <ThemedText style={[styles.toggleText, { color: theme.muted }]}>
                {mode === 'register' ? 'Already have an account? ' : 'New here? '}
              </ThemedText>
              <ThemedText style={[styles.toggleLink, { color: theme.primary }]}>
                {mode === 'register' ? 'Log in' : 'Create account'}
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

function StepPill({ label, active, complete }: { label: string; active: boolean; complete: boolean }) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  return (
    <View
      style={[
        styles.stepPill,
        {
          backgroundColor: active || complete ? theme.primary : theme.surface,
          borderColor: active || complete ? theme.primary : theme.border,
        },
      ]}>
      <ThemedText style={[styles.stepText, { color: active || complete ? '#FFFFFF' : theme.muted }]}>
        {label}
      </ThemedText>
    </View>
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
      <ThemedText style={[styles.inputLabel, { color: theme.muted }]}>{label}</ThemedText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
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
  headerCopy: {
    flex: 1,
  },
  subtitle: { fontSize: 12, marginTop: 4 },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressLine: {
    flex: 1,
    height: 1,
  },
  stepPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  stepText: {
    fontSize: 12,
    fontWeight: '700',
  },
  form: {
    gap: 12,
    paddingBottom: 6,
  },
  inputBlock: {
    gap: 6,
  },
  inputLabel: { fontSize: 12 },
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
    justifyContent: 'center',
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
