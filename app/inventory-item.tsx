import { useEffect, useState } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrency } from '@/hooks/use-currency';
import { createItem, getItemById, initDb, updateItem } from '@/lib/db';

function formatNumberInput(value: string) {
  const digits = value.replace(/[^\d]/g, '');
  if (!digits) {
    return '';
  }
  const number = Number(digits);
  return Number.isFinite(number) ? number.toLocaleString('en-NG') : '';
}

function parseNumberInput(value: string) {
  const digits = value.replace(/[^\d]/g, '');
  return digits ? Number(digits) : 0;
}

export default function InventoryItemScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { display } = useCurrency();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [stockQty, setStockQty] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadItem() {
      await initDb();
      if (!id) {
        return;
      }
      const item = await getItemById(id);
      if (item) {
        setName(item.name);
        setPrice(item.price ? item.price.toLocaleString('en-NG') : '');
        setCostPrice(
          item.cost_price ? item.cost_price.toLocaleString('en-NG') : ''
        );
        setStockQty(String(item.stock_qty));
      }
    }
    loadItem().catch((error) => {
      Alert.alert('Load error', 'Unable to load item details.');
      console.error(error);
    });
  }, [id]);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Name required', 'Enter an item name.');
      return;
    }
    const priceValue = parseNumberInput(price);
    const costValue = parseNumberInput(costPrice);
    const stockValue = Number(stockQty);
    if (Number.isNaN(priceValue) || priceValue < 0) {
      Alert.alert('Invalid price', 'Enter a valid price.');
      return;
    }
    if (Number.isNaN(costValue) || costValue < 0) {
      Alert.alert('Invalid cost', 'Enter a valid cost price.');
      return;
    }
    if (Number.isNaN(stockValue) || stockValue < 0) {
      Alert.alert('Invalid stock', 'Enter a valid stock quantity.');
      return;
    }

    try {
      setLoading(true);
      await initDb();
      if (id) {
        await updateItem({
          id,
          name: name.trim(),
          price: priceValue,
          costPrice: costValue,
          stockQty: stockValue,
        });
      } else {
        await createItem({
          name: name.trim(),
          price: priceValue,
          costPrice: costValue,
          stockQty: stockValue,
        });
      }
      router.back();
    } catch (error) {
      Alert.alert('Save failed', 'Unable to save item.');
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
                <ThemedText type="title">{id ? 'Edit Item' : 'Add Item'}</ThemedText>
                <ThemedText style={[styles.caption, { color: theme.muted }]}>
                  Keep your pricing and stock accurate.
                </ThemedText>
              </View>
            </View>
          </View>

          <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <View style={styles.inputBlock}>
            <ThemedText style={[styles.label, { color: theme.muted }]}>Item name</ThemedText>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Phone Charger"
              placeholderTextColor={theme.muted}
              style={[
                styles.textInput,
                { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text },
              ]}
            />
          </View>
          <View style={styles.inputBlock}>
            <ThemedText style={[styles.label, { color: theme.muted }]}>Price ({display})</ThemedText>
              <TextInput
                value={price}
                onChangeText={(value) => setPrice(formatNumberInput(value))}
                keyboardType="number-pad"
                placeholder="3000"
              placeholderTextColor={theme.muted}
              style={[
                styles.textInput,
                { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text },
              ]}
            />
          </View>
          <View style={styles.inputBlock}>
            <ThemedText style={[styles.label, { color: theme.muted }]}>
              Cost price ({display})
            </ThemedText>
              <TextInput
                value={costPrice}
                onChangeText={(value) => setCostPrice(formatNumberInput(value))}
                keyboardType="number-pad"
                placeholder="2000"
              placeholderTextColor={theme.muted}
              style={[
                styles.textInput,
                { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text },
              ]}
            />
          </View>
          <View style={styles.inputBlock}>
            <ThemedText style={[styles.label, { color: theme.muted }]}>Stock quantity</ThemedText>
            <TextInput
              value={stockQty}
              onChangeText={setStockQty}
              keyboardType="number-pad"
              placeholder="10"
              placeholderTextColor={theme.muted}
              style={[
                styles.textInput,
                { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text },
              ]}
            />
          </View>
        </View>

          <Pressable
            onPress={handleSave}
            disabled={loading}
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}>
            <ThemedText style={styles.primaryButtonText}>
              {loading ? 'Saving...' : 'Save Item'}
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
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  inputBlock: { gap: 6 },
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
