import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { exportData, importData, initDb } from '@/lib/db';

export default function BackupScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);

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

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ThemedText style={styles.backLabel}>Back</ThemedText>
          </Pressable>
          <ThemedText type="subtitle">Backup & Data</ThemedText>
          <View style={styles.headerSpacer} />
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
            disabled={busy}
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}>
            <ThemedText style={styles.primaryButtonText}>
              {busy ? 'Working...' : 'Export backup'}
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
            disabled={busy}
            style={[styles.secondaryButton, { borderColor: theme.border }]}>
            <ThemedText style={styles.secondaryButtonText}>
              {busy ? 'Working...' : 'Import backup'}
            </ThemedText>
          </Pressable>
        </View>

        <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <ThemedText style={styles.cardTitle}>Google Drive sync</ThemedText>
          <ThemedText style={styles.cardMeta}>
            Connect Google Drive to sync automatically. (Coming soon)
          </ThemedText>
          <Pressable disabled style={[styles.secondaryButton, { borderColor: theme.border }]}>
            <ThemedText style={styles.secondaryButtonText}>Enable Drive sync</ThemedText>
          </Pressable>
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
    gap: 10,
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
});
