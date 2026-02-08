import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { adjustStock, getItems, initDb } from '@/lib/db';

type Item = {
  id: string;
  name: string;
  stock: number;
};

type Mode = 'in' | 'out';

export default function StockAdjustScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Item[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('in');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      await initDb();
      const rows = await getItems();
      setItems(
        rows.map((row) => ({
          id: row.id,
          name: row.name,
          stock: row.stock_qty,
        }))
      );
    }
    load().catch((error) => {
      Alert.alert('Load error', 'Unable to load inventory.');
      console.error(error);
    });
  }, []);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId]
  );

  async function handleSave() {
    if (!selectedItem) {
      Alert.alert('Select item', 'Choose an item to adjust.');
      return;
    }
    const qtyValue = Number(quantity);
    if (Number.isNaN(qtyValue) || qtyValue <= 0) {
      Alert.alert('Invalid quantity', 'Enter a valid quantity.');
      return;
    }
    if (mode === 'out' && qtyValue > selectedItem.stock) {
      Alert.alert('Not enough stock', 'Quantity exceeds current stock.');
      return;
    }

    try {
      setLoading(true);
      const delta = mode === 'in' ? qtyValue : -qtyValue;
      await adjustStock({
        itemId: selectedItem.id,
        delta,
        reason: 'manual',
        note: note.trim() || undefined,
      });
      router.back();
    } catch (error) {
      Alert.alert('Save failed', 'Unable to update stock.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? Math.max(insets.top, 12) : 0}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top - 8, 0) }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <Pressable
                onPress={() => router.back()}
                style={[styles.backButton, { borderColor: theme.border }]}>
                <IconSymbol name="chevron.left" size={20} color={theme.primaryDeep} />
              </Pressable>
              <View style={styles.headerText}>
                <ThemedText type="title">Stock In/Out</ThemedText>
                <ThemedText style={[styles.caption, { color: theme.muted }]}>
                  Record manual stock adjustments.
                </ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.section}>
          <ThemedText type="subtitle">Choose item</ThemedText>
          <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            {items.map((item, index) => {
              const isSelected = item.id === selectedId;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setSelectedId(item.id)}
                  style={[
                    styles.row,
                    index > 0 && [styles.rowDivider, { borderTopColor: theme.border }],
                    isSelected && { backgroundColor: theme.secondary },
                  ]}>
                  <ThemedText style={styles.itemName}>{item.name}</ThemedText>
                  <ThemedText style={[styles.itemMeta, { color: theme.muted }]}>
                    {item.stock} in stock
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">Adjustment</ThemedText>
          <View style={styles.modeRow}>
            {(['in', 'out'] as Mode[]).map((value) => {
              const isActive = mode === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => setMode(value)}
                  style={[
                    styles.modeChip,
                    {
                      backgroundColor: isActive ? theme.primary : theme.surface,
                      borderColor: theme.border,
                    },
                  ]}>
                  <ThemedText style={{ color: isActive ? '#FFFFFF' : theme.text }}>
                    Stock {value}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <View style={styles.inputBlock}>
              <ThemedText style={[styles.label, { color: theme.muted }]}>Quantity</ThemedText>
              <TextInput
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="number-pad"
                placeholder="10"
                placeholderTextColor={theme.muted}
                style={[
                  styles.textInput,
                  { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text },
                ]}
              />
            </View>
            <View style={styles.inputBlock}>
              <ThemedText style={[styles.label, { color: theme.muted }]}>Note (optional)</ThemedText>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Restock from supplier"
                placeholderTextColor={theme.muted}
                style={[
                  styles.textInput,
                  { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text },
                ]}
              />
            </View>
          </View>
        </View>

          <Pressable
            onPress={handleSave}
            disabled={loading}
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}>
            <ThemedText style={styles.primaryButtonText}>
              {loading ? 'Saving...' : 'Save adjustment'}
            </ThemedText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardWrap: { flex: 1 },
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
    gap: 24,
  },
  header: { gap: 8 },
  headerText: { gap: 4 },
  caption: { fontSize: 14 },
  section: { gap: 12 },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
  },
  rowDivider: { borderTopWidth: 1 },
  itemName: { fontSize: 15 },
  itemMeta: { fontSize: 12 },
  modeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modeChip: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  inputBlock: {
    padding: 16,
    gap: 6,
  },
  label: { fontSize: 12 },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'Sora-Regular',
  },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16 },
});
