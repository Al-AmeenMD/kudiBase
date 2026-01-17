import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
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
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ThemedText style={styles.backLabel}>Back</ThemedText>
          </Pressable>
          <ThemedText type="subtitle">Help & support</ThemedText>
          <View style={styles.headerSpacer} />
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <ThemedText style={styles.sectionTitle}>FAQs</ThemedText>
          <View style={styles.faqItem}>
            <ThemedText style={styles.faqQuestion}>How do I back up my data?</ThemedText>
            <ThemedText style={[styles.faqAnswer, { color: theme.text }]}>
              Use Settings → Backup & sync to export your data file. Keep it in a safe location.
            </ThemedText>
          </View>
          <View style={styles.faqItem}>
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
          <ThemedText style={styles.sectionTitle}>Contact support</ThemedText>
          <ThemedText style={[styles.bodyText, { color: theme.text }]}>
            Need help? Reach out and we’ll assist you as soon as possible.
          </ThemedText>
          <Pressable
            onPress={handleWhatsApp}
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}>
            <ThemedText style={styles.primaryButtonText}>WhatsApp support</ThemedText>
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
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
  },
  faqItem: {
    gap: 6,
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
  primaryButton: {
    marginTop: 6,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14 },
});
