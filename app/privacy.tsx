import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function PrivacyScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ThemedText style={styles.backLabel}>Back</ThemedText>
          </Pressable>
          <ThemedText type="subtitle">Privacy Policy</ThemedText>
          <View style={styles.headerSpacer} />
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <ThemedText style={styles.sectionTitle}>Overview</ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.text }]}>
            KudiBase stores your business data locally on your device. We only access data needed to
            run the app and backups you initiate.
          </ThemedText>
        </View>

        <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <ThemedText style={styles.sectionTitle}>Data we store</ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.text }]}>
            Inventory items, sales, debt records, payments, and your business profile settings are
            stored on this device. You control when to export or sync backups.
          </ThemedText>
        </View>

        <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <ThemedText style={styles.sectionTitle}>Sharing</ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.text }]}>
            We do not share your data with third parties. Any receipts or exports you share are
            initiated by you.
          </ThemedText>
        </View>

        <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <ThemedText style={styles.sectionTitle}>Updates</ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.text }]}>
            This policy may change as features evolve. Check this screen for the latest updates.
          </ThemedText>
          <ThemedText style={styles.caption}>Last updated: 2025-01-01</ThemedText>
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
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 18,
  },
  caption: { fontSize: 11, opacity: 0.6 },
});
