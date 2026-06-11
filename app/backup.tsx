import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { exportData, importData, initDb } from '@/lib/db';

export default function BackupScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pendingImportUri, setPendingImportUri] = useState<string | null>(null);

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
      setPendingImportUri(result.assets[0].uri);
    } catch (error) {
      Alert.alert('Import failed', 'Unable to import this file.');
      console.error(error);
    }
  }

  async function confirmImport() {
    if (!pendingImportUri) {
      return;
    }

    try {
      setImporting(true);
      const content = await FileSystem.readAsStringAsync(pendingImportUri);
      const payload = JSON.parse(content);
      await initDb();
      await importData(payload);
      setPendingImportUri(null);
      Alert.alert('Import complete', 'Your data has been restored.');
    } catch (error) {
      Alert.alert('Import failed', 'Unable to import this file.');
      console.error(error);
    } finally {
      setImporting(false);
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
      </ScrollView>

      <ConfirmDialog
        visible={pendingImportUri !== null}
        title="Import backup?"
        message="This will replace the current data on this device with the selected backup file."
        confirmLabel="Import"
        iconName="arrow.up.circle.fill"
        loading={importing}
        variant="destructive"
        onCancel={() => setPendingImportUri(null)}
        onConfirm={confirmImport}
      />
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
