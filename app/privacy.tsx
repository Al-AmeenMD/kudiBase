import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function PrivacyScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top - 8, 0) }]}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backButton, { borderColor: theme.border }]}>
            <IconSymbol name="chevron.left" size={20} color={theme.primaryDeep} />
          </Pressable>
          <ThemedText type="subtitle">Privacy Policy</ThemedText>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.introCard, { backgroundColor: theme.secondary }]}>
          <View style={styles.introRow}>
            <View style={styles.introBadge}>
              <IconSymbol name="shield.fill" size={22} color={theme.primaryDeep} />
            </View>
            <View style={styles.introCopy}>
              <ThemedText style={[styles.introTitle, { color: theme.onSecondary }]}>
                Your data stays yours
              </ThemedText>
              <ThemedText style={[styles.introSubtitle, { color: theme.onSecondary }]}>
                KudiBase runs offline-first. We store data locally unless you choose to export or sync.
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBadge, { backgroundColor: theme.secondary }]}>
              <IconSymbol name="archivebox.fill" size={18} color={theme.primaryDeep} />
            </View>
            <ThemedText style={styles.sectionTitle}>Data we store</ThemedText>
          </View>
          <View style={styles.list}>
            <ThemedText style={[styles.bodyText, { color: theme.text }]}>
              Inventory items, sales, debts, payments, and business profile details.
            </ThemedText>
            <ThemedText style={[styles.bodyText, { color: theme.text }]}>
              App settings like currency, theme, and reminders.
            </ThemedText>
          </View>
        </View>

        <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBadge, { backgroundColor: theme.secondary }]}>
              <IconSymbol name="cloud.fill" size={18} color={theme.primaryDeep} />
            </View>
            <ThemedText style={styles.sectionTitle}>Sharing & backups</ThemedText>
          </View>
          <View style={styles.list}>
            <ThemedText style={[styles.bodyText, { color: theme.text }]}>
              We do not share your data with third parties.
            </ThemedText>
            <ThemedText style={[styles.bodyText, { color: theme.text }]}>
              Receipts and exports are shared only when you trigger them.
            </ThemedText>
          </View>
        </View>

        <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBadge, { backgroundColor: theme.secondary }]}>
              <IconSymbol name="message.fill" size={18} color={theme.primaryDeep} />
            </View>
            <ThemedText style={styles.sectionTitle}>Policy updates</ThemedText>
          </View>
          <ThemedText style={[styles.bodyText, { color: theme.text }]}>
            We may update this policy as features evolve. Check this screen for the latest version.
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
  introCard: {
    borderRadius: 18,
    padding: 16,
  },
  introRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  introBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9F6EF',
  },
  introCopy: {
    flex: 1,
    gap: 4,
  },
  introTitle: {
    fontSize: 15,
  },
  introSubtitle: {
    fontSize: 12,
    opacity: 0.85,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    gap: 10,
    paddingTop: 4,
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
