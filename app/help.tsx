import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const supportWhatsApp = '2348065840512';

export default function HelpScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const router = useRouter();
  const insets = useSafeAreaInsets();

  async function handleWhatsApp() {
    const url = `https://wa.me/${supportWhatsApp}`;
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert('WhatsApp unavailable', 'Install WhatsApp to contact support.');
      return;
    }
    await Linking.openURL(url);
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
          <ThemedText type="subtitle">Help & support</ThemedText>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: theme.secondary }]}>
          <View style={styles.heroRow}>
            <View style={styles.heroBadge}>
              <IconSymbol name="questionmark.circle.fill" size={22} color={theme.primaryDeep} />
            </View>
            <View style={styles.heroCopy}>
              <ThemedText style={[styles.heroTitle, { color: theme.onSecondary }]}>
                We’re here to help
              </ThemedText>
              <ThemedText style={[styles.heroSubtitle, { color: theme.onSecondary }]}>
                Get answers fast or chat with our team on WhatsApp.
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBadge, { backgroundColor: theme.secondary }]}>
              <IconSymbol name="message.fill" size={18} color={theme.primaryDeep} />
            </View>
            <ThemedText style={styles.sectionTitle}>FAQs</ThemedText>
          </View>
          <View style={[styles.faqItem, styles.faqDivider, { borderBottomColor: theme.border }]}>
            <ThemedText style={styles.faqQuestion}>How do I back up my data?</ThemedText>
            <ThemedText style={[styles.faqAnswer, { color: theme.text }]}>
              Use Settings → Backup & sync to export your data file. Keep it in a safe location.
            </ThemedText>
          </View>
          <View style={[styles.faqItem, styles.faqDivider, { borderBottomColor: theme.border }]}>
            <ThemedText style={styles.faqQuestion}>How do I add inventory?</ThemedText>
            <ThemedText style={[styles.faqAnswer, { color: theme.text }]}>
              Go to Inventory and tap Add Item. You can update stock any time from Stock In/Out.
            </ThemedText>
          </View>
          <View style={styles.faqItem}>
            <ThemedText style={styles.faqQuestion}>Can I send receipts?</ThemedText>
            <ThemedText style={[styles.faqAnswer, { color: theme.text }]}>
              Yes. After completing a sale, open the receipt and tap Share.
            </ThemedText>
          </View>
        </View>

        <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBadge, { backgroundColor: theme.secondary }]}>
              <IconSymbol name="person.2.fill" size={18} color={theme.primaryDeep} />
            </View>
            <ThemedText style={styles.sectionTitle}>Contact support</ThemedText>
          </View>
          <ThemedText style={[styles.bodyText, { color: theme.text }]}>
            Need help? Reach out and we’ll assist you as soon as possible.
          </ThemedText>
          <View style={styles.contactRow}>
            <View style={styles.contactInfo}>
              <ThemedText style={styles.contactLabel}>WhatsApp</ThemedText>
              <ThemedText style={[styles.contactValue, { color: theme.text }]}>
                +234 806 584 0512
              </ThemedText>
            </View>
            <Pressable
              onPress={handleWhatsApp}
              style={[styles.primaryButton, { backgroundColor: theme.primary }]}>
              <ThemedText style={styles.primaryButtonText}>Chat now</ThemedText>
            </Pressable>
          </View>
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
  heroCard: {
    borderRadius: 18,
    padding: 16,
  },
  heroRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  heroBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9F6EF',
  },
  heroCopy: {
    flex: 1,
    gap: 4,
  },
  heroTitle: {
    fontSize: 15,
  },
  heroSubtitle: {
    fontSize: 12,
    opacity: 0.85,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
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
  sectionTitle: {
    fontSize: 13,
  },
  faqItem: {
    gap: 6,
    paddingVertical: 8,
  },
  faqDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#E6E0D3',
  },
  faqQuestion: {
    fontSize: 13,
  },
  faqAnswer: {
    fontSize: 12,
    lineHeight: 18,
  },
  bodyText: {
    fontSize: 12,
    lineHeight: 18,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  contactInfo: {
    gap: 4,
  },
  contactLabel: {
    fontSize: 11,
    opacity: 0.6,
  },
  contactValue: {
    fontSize: 14,
  },
  primaryButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14 },
});
