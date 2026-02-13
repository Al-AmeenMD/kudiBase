import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrency } from '@/hooks/use-currency';
import { getAppSetting, getItems, initDb, setAppSetting } from '@/lib/db';

type InventoryItem = {
  id: string;
  name: string;
  stock: number;
  cost: number;
};

const lowStockThreshold = 5;

export default function InventoryScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { format } = useCurrency();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [showLowStock, setShowLowStock] = useState(true);

  const isNarrow = width < 360;

  const loadItems = useCallback(async () => {
    await initDb();
    const rows = await getItems();
    setItems(
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        stock: row.stock_qty,
        cost: row.cost_price ?? 0,
      }))
    );
  }, []);

  useEffect(() => {
    async function loadPreferences() {
      await initDb();
      const stored = await getAppSetting('inventory_low_stock_visible');
      if (stored === 'false') {
        setShowLowStock(false);
      }
    }
    loadPreferences().catch(() => { });
    loadItems().catch((error) => {
      Alert.alert('Load error', 'Unable to load inventory data.');
      console.error(error);
    });
  }, [loadItems]);

  useFocusEffect(
    useCallback(() => {
      loadItems().catch((error) => {
        Alert.alert('Load error', 'Unable to refresh inventory.');
        console.error(error);
      });
    }, [loadItems])
  );

  const inventoryList = useMemo(() => {
    return items.map((item) => ({
      ...item,
      status: item.stock <= 5 ? 'Low stock' : 'In stock',
    }));
  }, [items]);

  const inventoryTotals = useMemo(() => {
    const totalUnits = items.reduce((sum, item) => sum + item.stock, 0);
    const totalCost = items.reduce((sum, item) => sum + item.stock * item.cost, 0);
    return {
      totalUnits,
      totalCost,
      itemCount: items.length,
    };
  }, [items]);

  const lowStockList = useMemo(() => {
    return inventoryList.filter((item) => item.stock <= lowStockThreshold);
  }, [inventoryList]);

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedText type="title">Inventory</ThemedText>
          <ThemedText style={styles.caption}>Track stock levels and restock fast.</ThemedText>
        </View>

        <View style={[styles.actionRow, isNarrow && styles.actionRowStack]}>
          <Pressable
            style={[styles.actionButton, { backgroundColor: theme.primary }]}
            onPress={() => router.push('/inventory-item')}>
            <ThemedText style={styles.actionText}>Add Item</ThemedText>
          </Pressable>
          <Pressable
            style={[
              styles.secondaryButton,
              { borderColor: theme.border, backgroundColor: theme.surface },
            ]}
            onPress={() => router.push('/stock-adjust')}>
            <ThemedText style={styles.secondaryText}>Stock In/Out</ThemedText>
          </Pressable>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">Inventory summary</ThemedText>
          <View style={[styles.summaryCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <View style={styles.summaryRow}>
              <View>
                <ThemedText style={styles.summaryLabel}>Total stock cost</ThemedText>
                <ThemedText style={styles.summaryValue}>{format(inventoryTotals.totalCost)}</ThemedText>
              </View>
              <View style={styles.summaryMetaBlock}>
                <ThemedText style={styles.summaryMetaLabel}>Items</ThemedText>
                <ThemedText style={styles.summaryMetaValue}>{inventoryTotals.itemCount}</ThemedText>
              </View>
              <View style={styles.summaryMetaBlock}>
                <ThemedText style={styles.summaryMetaLabel}>Units</ThemedText>
                <ThemedText style={styles.summaryMetaValue}>{inventoryTotals.totalUnits}</ThemedText>
              </View>
            </View>
            <ThemedText style={[styles.summaryHint, { color: theme.muted }]}>
              Based on cost price × current stock.
            </ThemedText>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">All inventory</ThemedText>
          <View
            style={[
              styles.card,
              { borderColor: theme.border, backgroundColor: theme.surface },
            ]}>
            {inventoryList.length === 0 ? (
              <View style={styles.emptyState}>
                <ThemedText style={[styles.emptyText, { color: theme.muted }]}>
                  No inventory yet.
                </ThemedText>
              </View>
            ) : (
              inventoryList.map((item, index) => (
                <Pressable
                  key={item.id}
                  onPress={() => router.push({ pathname: '/inventory-item', params: { id: item.id } })}
                  style={[
                    styles.row,
                    index > 0 && [styles.rowDivider, { borderTopColor: theme.border }],
                  ]}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <ThemedText style={styles.itemName} numberOfLines={1} ellipsizeMode="tail">
                      {item.name}
                    </ThemedText>
                    <ThemedText style={styles.itemMeta}>{item.status}</ThemedText>
                  </View>
                  <View style={[styles.stockPill, { backgroundColor: theme.secondary, flexShrink: 0 }]}>
                    <ThemedText style={[styles.stockText, { color: theme.onSecondary }]}>
                      {item.stock}
                    </ThemedText>
                  </View>
                </Pressable>
              ))
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Pressable
            onPress={() => {
              setShowLowStock((prev) => {
                const next = !prev;
                setAppSetting('inventory_low_stock_visible', next ? 'true' : 'false').catch(() => { });
                return next;
              });
            }}
            style={styles.sectionHeader}>
            <ThemedText type="subtitle">Low stock alerts</ThemedText>
            <ThemedText style={styles.toggleText}>
              {showLowStock ? 'Hide' : 'Show'}
            </ThemedText>
          </Pressable>
          <View
            style={[
              styles.card,
              { borderColor: theme.border, backgroundColor: theme.surface },
            ]}>
            {showLowStock ? (
              lowStockList.length === 0 ? (
                <View style={styles.emptyState}>
                  <ThemedText style={[styles.emptyText, { color: theme.muted }]}>
                    No low stock items.
                  </ThemedText>
                </View>
              ) : (
                lowStockList.map((item, index) => (
                  <Pressable
                    key={item.id}
                    onPress={() => router.push({ pathname: '/inventory-item', params: { id: item.id } })}
                    style={[
                      styles.row,
                      index > 0 && [styles.rowDivider, { borderTopColor: theme.border }],
                    ]}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <ThemedText style={styles.itemName} numberOfLines={1} ellipsizeMode="tail">
                        {item.name}
                      </ThemedText>
                      <ThemedText style={styles.itemMeta}>Low stock</ThemedText>
                    </View>
                    <View style={[styles.stockPill, { backgroundColor: theme.secondary, flexShrink: 0 }]}>
                      <ThemedText style={[styles.stockText, { color: theme.onSecondary }]}>
                        {item.stock}
                      </ThemedText>
                    </View>
                  </Pressable>
                ))
              )
            ) : (
              <View style={styles.emptyState}>
                <ThemedText style={[styles.emptyText, { color: theme.muted }]}>
                  Low stock list hidden.
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 24,
  },
  header: { gap: 8 },
  caption: { fontSize: 14, opacity: 0.7 },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionRowStack: {
    flexDirection: 'column',
  },
  actionButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  actionText: { color: '#FFFFFF', fontSize: 14 },
  secondaryButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  secondaryText: { fontSize: 14 },
  section: { gap: 12 },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  summaryMetaBlock: {
    alignItems: 'flex-end',
  },
  summaryMetaLabel: {
    fontSize: 11,
    opacity: 0.7,
  },
  summaryMetaValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryHint: {
    fontSize: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleText: {
    fontSize: 12,
    color: '#0F6A3D',
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowDivider: {
    borderTopWidth: 1,
  },
  itemName: { fontSize: 15 },
  itemMeta: { fontSize: 12, opacity: 0.6 },
  emptyState: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: { fontSize: 13 },
  stockPill: {
    minWidth: 36,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F4E6C1',
    alignItems: 'center',
  },
  stockText: { fontSize: 13 },
});
