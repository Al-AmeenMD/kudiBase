import { makeRedirectUri } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { exportData, getAppSetting, importData, initDb } from '@/lib/db';
import {
  clearDriveSession,
  downloadDriveBackup,
  getDriveClientIds,
  getDriveScope,
  getDriveSession,
  isDailySyncEnabled,
  isDriveEnabled,
  saveDriveSession,
  setDailySyncEnabled,
  shouldRunDailySync,
  uploadDriveBackup,
} from '@/lib/google-drive';
import { isPremium } from '@/lib/subscription';

WebBrowser.maybeCompleteAuthSession();

export default function BackupScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [premium, setPremium] = useState(false);
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveSyncing, setDriveSyncing] = useState(false);
  const [driveDaily, setDriveDaily] = useState(false);
  const [driveLastSync, setDriveLastSync] = useState<string | null>(null);

  const driveIds = getDriveClientIds();
  const isExpoGo = Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient';

  // Explicitly generate the redirect URI
  const redirectUri = makeRedirectUri({
    native: 'kudibase://',
  });

  // For Expo Go, use the specific proxy. For native/dev builds, use the generated one.
  const finalRedirectUri = isExpoGo ? 'https://auth.expo.io/@al_ameenmd/kudibase' : redirectUri;

  const [request, response, promptAsync] = Google.useAuthRequest({
    // In Expo Go, strictly use the Web Client ID (generic clientId)
    // We must UNDEFINE standard platform IDs or they will take precedence
    iosClientId: isExpoGo ? undefined : driveIds.iosClientId,
    androidClientId: isExpoGo ? undefined : driveIds.androidClientId,
    webClientId: driveIds.webClientId,

    // Force Valid Redirect URI
    clientId: isExpoGo ? driveIds.webClientId : undefined,
    redirectUri: finalRedirectUri,
    scopes: [getDriveScope()],
  });

  // Debug logging
  useEffect(() => {
    if (request) {
      console.log('Google Auth Request Configured:', {
        redirectUri: request.redirectUri,
        clientId: request.clientId,
        isExpoGo
      });
    }
  }, [request, isExpoGo]);

  useEffect(() => {
    isPremium()
      .then(setPremium)
      .catch(() => { });
  }, []);

  useEffect(() => {
    async function handleAuthResponse() {
      if (response?.type === 'success') {
        const { authentication } = response;
        if (authentication?.accessToken) {
          try {
            const accessToken = authentication.accessToken;
            const expiresIn = authentication.expiresIn;
            await saveDriveSession({ accessToken, expiresIn });
            setDriveConnected(true);
            setDriveDaily(true);
            await setDailySyncEnabled(true);
          } catch (error) {
            console.error('Failed to save session:', error);
            Alert.alert('Error', 'Failed to save login session.');
          }
        }
      } else if (response?.type === 'error') {
        Alert.alert('Sign-in failed', 'Google sign-in encountered an error.');
        console.error('Google Auth Error:', response.error);
      }
    }
    handleAuthResponse();
  }, [response]);

  useEffect(() => {
    async function loadDriveState() {
      const [enabled, daily, session, lastSync] = await Promise.all([
        isDriveEnabled(),
        isDailySyncEnabled(),
        getDriveSession(),
        getAppSetting('drive_last_sync'),
      ]);
      setDriveConnected(enabled && !!session?.token);
      setDriveDaily(daily);
      if (lastSync) {
        const last = Number(lastSync);
        setDriveLastSync(Number.isFinite(last) ? new Date(last).toLocaleDateString('en-NG') : null);
      }
    }
    loadDriveState().catch(() => { });
  }, []);

  useEffect(() => {
    async function runAutoSync() {
      if (!premium || !driveConnected || !driveDaily) {
        return;
      }
      const session = await getDriveSession();
      if (!session || session.expiryMs <= Date.now()) {
        return;
      }
      const shouldSync = await shouldRunDailySync();
      if (!shouldSync) {
        return;
      }
      try {
        setDriveSyncing(true);
        await uploadDriveBackup(session.token);
        setDriveLastSync(new Date().toLocaleDateString('en-NG'));
      } catch (error) {
        console.error(error);
      } finally {
        setDriveSyncing(false);
      }
    }
    runAutoSync().catch(() => { });
  }, [driveConnected, driveDaily, premium]);

  async function handleExport() {
    try {
      setExporting(true);
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
      setExporting(false);
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
              setImporting(true);
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
              setImporting(false);
            }
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Import failed', 'Unable to import this file.');
      console.error(error);
    }
  }

  function handleConnectDrive() {
    if (!driveIds.webClientId && !driveIds.iosClientId && !driveIds.androidClientId) {
      Alert.alert('Missing config', 'Please configure Google Drive Client IDs in app.json');
      return;
    }
    // Debug info for user
    console.log('Initiating Google Auth with URI:', finalRedirectUri);
    promptAsync();
  }

  async function handleSyncNow() {
    try {
      setDriveSyncing(true);
      const session = await getDriveSession();
      if (!session || session.expiryMs <= Date.now()) {
        Alert.alert('Reconnect required', 'Please reconnect Google Drive.');
        return;
      }
      await uploadDriveBackup(session.token);
      setDriveLastSync(new Date().toLocaleDateString('en-NG'));
      Alert.alert('Synced', 'Drive backup updated.');
    } catch (error) {
      Alert.alert('Sync failed', 'Unable to sync to Drive.');
      console.error(error);
    } finally {
      setDriveSyncing(false);
    }
  }

  async function handleRestoreFromDrive() {
    try {
      setDriveSyncing(true);
      const session = await getDriveSession();
      if (!session || session.expiryMs <= Date.now()) {
        Alert.alert('Reconnect required', 'Please reconnect Google Drive.');
        return;
      }
      await downloadDriveBackup(session.token);
      setDriveLastSync(new Date().toLocaleDateString('en-NG'));
      Alert.alert('Restored', 'Drive backup restored.');
    } catch (error) {
      Alert.alert('Restore failed', 'Unable to restore from Drive.');
      console.error(error);
    } finally {
      setDriveSyncing(false);
    }
  }

  async function handleDisconnectDrive() {
    await clearDriveSession();
    setDriveConnected(false);
    setDriveDaily(false);
    setDriveLastSync(null);
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
          <ThemedText type="subtitle">Backup & Data</ThemedText>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <ThemedText style={styles.cardTitle}>Export data</ThemedText>
          <ThemedText style={styles.cardMeta}>
            Create a backup file you can share or store.
          </ThemedText>
          <Pressable
            onPress={handleExport}
            disabled={exporting}
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}>
            <ThemedText style={styles.primaryButtonText}>
              {exporting ? 'Working...' : 'Export backup'}
            </ThemedText>
          </Pressable>
        </View>

        <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <ThemedText style={styles.cardTitle}>Import data</ThemedText>
          <ThemedText style={styles.cardMeta}>
            Restore from a previously exported backup file.
          </ThemedText>
          <Pressable
            onPress={handleImport}
            disabled={importing}
            style={[styles.secondaryButton, { borderColor: theme.border }]}>
            <ThemedText style={styles.secondaryButtonText}>
              {importing ? 'Working...' : 'Import backup'}
            </ThemedText>
          </Pressable>
        </View>

        <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <View style={styles.cardHeader}>
            <ThemedText style={styles.cardTitle}>Google Drive sync</ThemedText>
            {!premium ? (
              <IconSymbol name="crown.fill" size={18} color={theme.primaryDeep} />
            ) : null}
          </View>
          <ThemedText style={styles.cardMeta}>
            {premium
              ? driveConnected
                ? 'Connected to Google Drive (App Data).'
                : 'Connect Google Drive to sync automatically.'
              : 'Premium feature'}
          </ThemedText>
          {premium ? (
            <>
              {!driveConnected ? (
                <View>
                  <Pressable
                    onPress={handleConnectDrive}
                    disabled={!request}
                    style={[styles.secondaryButton, { borderColor: theme.border, opacity: !request ? 0.5 : 1 }]}>
                    <ThemedText style={styles.secondaryButtonText}>Connect Google Drive</ThemedText>
                  </Pressable>
                  {/* Debugging Info for User */}
                  <ThemedText style={[styles.cardMeta, { marginTop: 8, fontSize: 10, fontFamily: 'monospace' }]}>
                    Redirect: {finalRedirectUri}{'\n'}
                    ClientID: {request?.clientId?.slice(0, 15)}...
                  </ThemedText>
                </View>
              ) : (
                <>
                  <View style={styles.toggleRow}>
                    <View>
                      <ThemedText style={styles.cardTitle}>Auto sync daily</ThemedText>
                      <ThemedText style={styles.cardMeta}>
                        {driveLastSync ? `Last synced: ${driveLastSync}` : 'No sync yet'}
                      </ThemedText>
                    </View>
                    <Switch
                      value={driveDaily}
                      onValueChange={(value) => {
                        setDriveDaily(value);
                        setDailySyncEnabled(value).catch(() => { });
                      }}
                      trackColor={{ true: theme.primary, false: theme.border }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                  <View style={styles.driveActions}>
                    <Pressable
                      onPress={handleSyncNow}
                      disabled={driveSyncing}
                      style={[styles.primaryButton, { backgroundColor: theme.primary }]}>
                      <ThemedText style={styles.primaryButtonText}>
                        {driveSyncing ? 'Syncing...' : 'Sync now'}
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={handleRestoreFromDrive}
                      disabled={driveSyncing}
                      style={[styles.secondaryButton, { borderColor: theme.border }]}>
                      <ThemedText style={styles.secondaryButtonText}>Restore from Drive</ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={handleDisconnectDrive}
                      style={[styles.tertiaryButton, { borderColor: theme.border }]}>
                      <ThemedText style={styles.secondaryButtonText}>Disconnect</ThemedText>
                    </Pressable>
                  </View>
                </>
              )}
            </>
          ) : (
            <Pressable
              onPress={() => router.push('/premium')}
              style={[styles.secondaryButton, { borderColor: theme.border }]}>
              <ThemedText style={styles.secondaryButtonText}>Upgrade to Premium</ThemedText>
            </Pressable>
          )}
        </View>
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
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardTitle: { fontSize: 14 },
  cardMeta: { fontSize: 12, opacity: 0.7 },
  primaryButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14 },
  secondaryButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  secondaryButtonText: { fontSize: 14 },
  tertiaryButton: {
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  driveActions: {
    gap: 10,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
});
