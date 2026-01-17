import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrency } from '@/hooks/use-currency';
import { getItems, getSalesSummary, initDb, recordSale } from '@/lib/db';

type PaymentMethod = 'Cash' | 'Transfer' | 'POS' | 'Pay Later';

type Item = {
  id: string;
  name: string;
  price: number;
  stock: number;
};

type CartItem = Item & {
  qty: number;
};

const paymentMethods: PaymentMethod[] = ['Cash', 'Transfer', 'POS', 'Pay Later'];

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { startMs: start.getTime(), endMs: end.getTime() };
}

function getWeekRange() {
  const start = new Date();
  const day = start.getDay();
  const diff = (day + 6) % 7;
  start.setDate(start.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { startMs: start.getTime(), endMs: end.getTime() };
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString('en-NG', { day: '2-digit', month: 'short' });
}

export default function SalesScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { format } = useCurrency();
  const router = useRouter();
  const scrollRef = useRef<ScrollView | null>(null);
  const cartRef = useRef<View | null>(null);
  const scrollYRef = useRef(0);
  const scrollViewHeightRef = useRef(0);
  const cartLayoutRef = useRef<{ y: number; height: number } | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date;
  });
  const [summary, setSummary] = useState({
    totalSales: 0,
    totalPaid: 0,
    totalDue: 0,
    saleCount: 0,
    byMethod: [] as Array<{
      method: string;
      totalSales: number;
      totalPaid: number;
      totalDue: number;
      saleCount: number;
    }>,
  });
  const [range, setRange] = useState<'today' | 'week' | 'custom'>('today');
  const [customStart, setCustomStart] = useState(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return start;
  });
  const [customEnd, setCustomEnd] = useState(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return end;
  });
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [qtyInputs, setQtyInputs] = useState<Record<string, string>>({});
  const amountWarnedRef = useRef(false);
  const qtyWarnedRef = useRef<Record<string, boolean>>({});

  const cartQuantities = useMemo(() => {
    return cart.reduce<Record<string, number>>((acc, item) => {
      acc[item.id] = item.qty;
      return acc;
    }, {});
  }, [cart]);

  const loadItems = useCallback(async () => {
    await initDb();
    const rows = await getItems();
    setItems(
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        price: row.price,
        stock: row.stock_qty,
      }))
    );
  }, []);

  const loadSummary = useCallback(async () => {
    await initDb();
    let startMs: number;
    let endMs: number;
    if (range === 'today') {
      ({ startMs, endMs } = getTodayRange());
    } else if (range === 'week') {
      ({ startMs, endMs } = getWeekRange());
    } else {
      startMs = customStart.getTime();
      endMs = customEnd.getTime();
      if (startMs > endMs) {
        const swap = startMs;
        startMs = endMs;
        endMs = swap;
      }
    }
    const result = await getSalesSummary(startMs, endMs);
    setSummary({
      totalSales: result.totals.total_sales ?? 0,
      totalPaid: result.totals.total_paid ?? 0,
      totalDue: result.totals.total_due ?? 0,
      saleCount: result.totals.sale_count ?? 0,
      byMethod: result.byMethod.map((row) => ({
        method: row.payment_method,
        totalSales: row.total_sales ?? 0,
        totalPaid: row.total_paid ?? 0,
        totalDue: row.total_due ?? 0,
        saleCount: row.sale_count ?? 0,
      })),
    });
  }, [range, customStart, customEnd]);


  useEffect(() => {
    loadItems().catch((error) => {
      Alert.alert('Setup error', 'Unable to load inventory data.');
      console.error(error);
    });
    loadSummary().catch((error) => {
      Alert.alert('Setup error', 'Unable to load sales summary.');
      console.error(error);
    });
  }, [loadItems, loadSummary]);

  useEffect(() => {
    setQtyInputs((prev) => {
      const next: Record<string, string> = {};
      cart.forEach((item) => {
        next[item.id] = prev[item.id] ?? String(item.qty);
      });
      return next;
    });
  }, [cart]);

  useFocusEffect(
    useCallback(() => {
      loadItems().catch((error) => {
        Alert.alert('Load error', 'Unable to refresh items.');
        console.error(error);
      });
      loadSummary().catch((error) => {
        Alert.alert('Load error', 'Unable to refresh summary.');
        console.error(error);
      });
    }, [loadItems, loadSummary])
  );

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  }, [cart]);

  const balanceDue = useMemo(() => {
    const paid = Number(amountReceived || 0);
    if (paymentMethod === 'Pay Later') {
      return subtotal - paid;
    }
    return 0;
  }, [paymentMethod, amountReceived, subtotal]);


  function scrollToCart() {
    const layout = cartLayoutRef.current;
    if (!layout) {
      return;
    }
    const scrollY = scrollYRef.current;
    const viewHeight = scrollViewHeightRef.current;
    const isVisible = scrollY <= layout.y && scrollY + viewHeight >= layout.y + layout.height;
    if (isVisible) {
      return;
    }
    scrollRef.current?.scrollTo({ y: Math.max(layout.y - 12, 0), animated: true });
  }

  function addToCart(item: Item) {
    setCart((prev) => {
      const existing = prev.find((entry) => entry.id === item.id);
      if (existing && existing.qty >= item.stock) {
        return prev;
      }
      if (existing) {
        return prev.map((entry) =>
          entry.id === item.id ? { ...entry, qty: entry.qty + 1 } : entry
        );
      }
      return [...prev, { ...item, qty: 1 }];
    });
    scrollToCart();
  }

  function updateQty(itemId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((entry) => {
          if (entry.id !== itemId) {
            return entry;
          }
          const nextQty = Math.max(0, entry.qty + delta);
          return { ...entry, qty: Math.min(nextQty, entry.stock) };
        })
        .filter((entry) => entry.qty > 0)
    );
  }

  function setQty(itemId: string, value: string) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return;
    }
    const nextQty = Math.max(1, Math.floor(parsed));
    setCart((prev) =>
      prev.map((entry) =>
        entry.id === itemId ? { ...entry, qty: Math.min(nextQty, entry.stock) } : entry
      )
    );
  }

  function updateQtyInput(itemId: string, value: string) {
    const currentStock = cart.find((entry) => entry.id === itemId)?.stock;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || value.trim() === '') {
      setQtyInputs((prev) => ({ ...prev, [itemId]: value }));
      return;
    }
    const nextQty = Math.max(1, Math.floor(parsed));
    const clampedQty = currentStock ? Math.min(nextQty, currentStock) : nextQty;
    if (currentStock && nextQty > currentStock && !qtyWarnedRef.current[itemId]) {
      qtyWarnedRef.current[itemId] = true;
      Alert.alert('Stock limit', 'Quantity exceeds available stock.');
    }
    if (currentStock && nextQty <= currentStock) {
      qtyWarnedRef.current[itemId] = false;
    }
    setQtyInputs((prev) => ({ ...prev, [itemId]: String(clampedQty) }));
    setCart((prev) =>
      prev.map((entry) => (entry.id === itemId ? { ...entry, qty: clampedQty } : entry))
    );
  }

  function commitQtyInput(itemId: string) {
    const value = qtyInputs[itemId];
    if (!value || value.trim() === '') {
      updateQtyInput(itemId, '1');
      return;
    }
    updateQtyInput(itemId, value);
  }

  async function handleCompleteSale() {
    if (cart.length === 0) {
      Alert.alert('Cart is empty', 'Add items before completing a sale.');
      return;
    }

    const exceedsStock = cart.find((item) => item.qty > item.stock);
    if (exceedsStock) {
      Alert.alert('Stock limit', `${exceedsStock.name} is out of stock.`);
      return;
    }

    if (paymentMethod === 'Pay Later' && !customerName && !customerPhone) {
      Alert.alert('Customer required', 'Enter a name or phone number for pay-later sales.');
      return;
    }

    const amountPaid =
      paymentMethod === 'Pay Later'
        ? Number(amountReceived || 0)
        : Number(amountReceived || subtotal);
    const balance = paymentMethod === 'Pay Later' ? Math.max(subtotal - amountPaid, 0) : 0;

    try {
      const saved = await recordSale({
        items: cart,
        paymentMethod,
        subtotal,
        amountPaid,
        balanceDue: balance,
        customerName,
        customerPhone,
        dueDate: dueDate.toISOString(),
      });
      const rows = await getItems();
      setItems(
        rows.map((row) => ({
          id: row.id,
          name: row.name,
          price: row.price,
          stock: row.stock_qty,
        }))
      );
      setCart([]);
      setAmountReceived('');
      setCustomerName('');
      setCustomerPhone('');
      setDueDate(() => {
        const date = new Date();
        date.setDate(date.getDate() + 7);
        return date;
      });
      await loadSummary();
      Alert.alert('Sale saved', 'Inventory updated offline.');
      if (saved?.saleId) {
        router.push({ pathname: '/receipt', params: { saleId: saved.saleId } });
      }
    } catch (error) {
      Alert.alert('Save failed', 'Could not save this sale. Try again.');
      console.error(error);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onLayout={(event) => {
          scrollViewHeightRef.current = event.nativeEvent.layout.height;
        }}
        onScroll={(event) => {
          scrollYRef.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}>
        <View style={styles.header}>
          <ThemedText type="title">POS</ThemedText>
          <ThemedText style={[styles.caption, { color: theme.muted }]}>
            Add items quickly, take payment, and send a receipt.
          </ThemedText>
        </View>

        <View style={styles.section}>
          <View style={styles.summaryHeader}>
            <ThemedText type="subtitle">Sales summary</ThemedText>
          </View>
          <View style={styles.rangeRow}>
            {(['today', 'week', 'custom'] as const).map((value) => (
              <Pressable
                key={value}
                onPress={() => setRange(value)}
                style={[
                  styles.rangeChip,
                  {
                    backgroundColor: range === value ? theme.primary : theme.surface,
                    borderColor: theme.border,
                  },
                ]}>
                <ThemedText style={{ color: range === value ? '#FFFFFF' : theme.text }}>
                  {value === 'today' ? 'Today' : value === 'week' ? 'This week' : 'Custom'}
                </ThemedText>
              </Pressable>
            ))}
          </View>
          {range === 'custom' && (
            <View style={styles.customRangeRow}>
              <Pressable
                onPress={() => setShowStartPicker(true)}
                style={[styles.dateChip, { borderColor: theme.border, backgroundColor: theme.surface }]}>
                <ThemedText style={styles.dateText}>From {formatDateLabel(customStart)}</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setShowEndPicker(true)}
                style={[styles.dateChip, { borderColor: theme.border, backgroundColor: theme.surface }]}>
                <ThemedText style={styles.dateText}>To {formatDateLabel(customEnd)}</ThemedText>
              </Pressable>
            </View>
          )}
          <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryBlock}>
                <ThemedText style={[styles.summaryLabel, { color: theme.muted }]}>Sales</ThemedText>
                <ThemedText style={styles.summaryValue}>{format(summary.totalSales)}</ThemedText>
                <ThemedText style={[styles.summaryMeta, { color: theme.muted }]}>
                  {summary.saleCount} transactions
                </ThemedText>
              </View>
              <View style={styles.summaryBlock}>
                <ThemedText style={[styles.summaryLabel, { color: theme.muted }]}>Cash in</ThemedText>
                <ThemedText style={styles.summaryValue}>{format(summary.totalPaid)}</ThemedText>
                <ThemedText style={[styles.summaryMeta, { color: theme.muted }]}>Collected</ThemedText>
              </View>
              <View style={styles.summaryBlock}>
                <ThemedText style={[styles.summaryLabel, { color: theme.muted }]}>Outstanding</ThemedText>
                <ThemedText style={styles.summaryValue}>{format(summary.totalDue)}</ThemedText>
                <ThemedText style={[styles.summaryMeta, { color: theme.muted }]}>Pay later</ThemedText>
              </View>
            </View>
          </View>
        </View>

        <Pressable
          onPress={() => router.push('/receipts')}
          style={[styles.receiptsButton, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <ThemedText style={styles.receiptsButtonText}>View receipt history</ThemedText>
        </Pressable>


        {showStartPicker && (
          <DateTimePicker
            value={customStart}
            mode="date"
            display={Platform.OS === 'ios' ? 'compact' : 'default'}
            onChange={(_event, date) => {
              setShowStartPicker(false);
              if (date) {
                const next = new Date(date);
                next.setHours(0, 0, 0, 0);
                setCustomStart(next);
              }
            }}
          />
        )}
        {showEndPicker && (
          <DateTimePicker
            value={customEnd}
            mode="date"
            display={Platform.OS === 'ios' ? 'compact' : 'default'}
            onChange={(_event, date) => {
              setShowEndPicker(false);
              if (date) {
                const next = new Date(date);
                next.setHours(23, 59, 59, 999);
                setCustomEnd(next);
              }
            }}
          />
        )}

        {showDueDatePicker && Platform.OS !== 'ios' && (
          <DateTimePicker
            value={dueDate}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={(_event, date) => {
              setShowDueDatePicker(false);
              if (date) {
                const next = new Date(date);
                next.setHours(23, 59, 59, 999);
                setDueDate(next);
              }
            }}
          />
        )}
        {showDueDatePicker && Platform.OS === 'ios' && (
          <Modal transparent animationType="fade" onRequestClose={() => setShowDueDatePicker(false)}>
            <Pressable style={styles.modalBackdrop} onPress={() => setShowDueDatePicker(false)}>
              <Pressable style={[styles.modalCard, { backgroundColor: theme.surface }]}>
                <View style={styles.modalHeader}>
                  <ThemedText type="subtitle">Select due date</ThemedText>
                  <Pressable onPress={() => setShowDueDatePicker(false)}>
                    <ThemedText style={styles.modalDone}>Done</ThemedText>
                  </Pressable>
                </View>
                <DateTimePicker
                  value={dueDate}
                  mode="date"
                  display="spinner"
                  minimumDate={new Date()}
                  onChange={(_event, date) => {
                    if (date) {
                      const next = new Date(date);
                      next.setHours(23, 59, 59, 999);
                      setDueDate(next);
                    }
                  }}
                />
              </Pressable>
            </Pressable>
          </Modal>
        )}

        <View style={styles.section}>
          <ThemedText type="subtitle">Quick add items</ThemedText>
          <View style={styles.itemGrid}>
            {items.map((item) => {
              const qtyInCart = cartQuantities[item.id] ?? 0;
              const isAtLimit = qtyInCart >= item.stock;
              const isOutOfStock = item.stock === 0 || isAtLimit;
              const statusLabel = isOutOfStock ? 'Out of stock' : '';

              return (
                <Pressable
                  key={item.id}
                  onPress={() => addToCart(item)}
                  disabled={isOutOfStock || isAtLimit}
                  style={[
                    styles.itemCard,
                    { backgroundColor: theme.surface, borderColor: theme.border },
                    (isOutOfStock || isAtLimit) && styles.itemCardDisabled,
                  ]}>
                  <ThemedText style={styles.itemName}>{item.name}</ThemedText>
                  <ThemedText style={[styles.itemMeta, { color: theme.muted }]}>
                    {format(item.price)} • {item.stock} in stock
                  </ThemedText>
                  {statusLabel ? (
                    <View style={[styles.statusPill, { backgroundColor: theme.secondary }]}>
                      <ThemedText style={[styles.statusText, { color: theme.onSecondary }]}>
                        {statusLabel}
                      </ThemedText>
                    </View>
                  ) : (
                    <View style={[styles.itemButton, { backgroundColor: theme.primary }]}>
                      <ThemedText style={styles.itemButtonText}>Add</ThemedText>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View
          style={styles.section}
          ref={cartRef}
          onLayout={(event) => {
            const { y, height } = event.nativeEvent.layout;
            cartLayoutRef.current = { y, height };
          }}>
          <ThemedText type="subtitle">Cart</ThemedText>
          <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            {cart.length === 0 ? (
              <View style={styles.emptyState}>
                <ThemedText style={[styles.emptyText, { color: theme.muted }]}>
                  No items yet. Tap an item to add.
                </ThemedText>
              </View>
            ) : (
              cart.map((item, index) => (
                <View
                  key={item.id}
                  style={[
                    styles.row,
                    index > 0 && [styles.rowDivider, { borderTopColor: theme.border }],
                  ]}>
                  <View>
                    <ThemedText style={styles.cartItemName}>{item.name}</ThemedText>
                    <ThemedText style={[styles.cartMeta, { color: theme.muted }]}>
                      {format(item.price)} each
                    </ThemedText>
                  </View>
                  <View style={styles.qtyControl}>
                    <Pressable
                      onPress={() => updateQty(item.id, -1)}
                      style={[styles.qtyButton, { borderColor: theme.border }]}>
                      <ThemedText style={styles.qtyText}>-</ThemedText>
                    </Pressable>
                    <TextInput
                      value={qtyInputs[item.id] ?? String(item.qty)}
                      onChangeText={(value) => updateQtyInput(item.id, value)}
                      onBlur={() => commitQtyInput(item.id)}
                      keyboardType="number-pad"
                      style={[
                        styles.qtyInput,
                        { borderColor: theme.border, color: theme.text },
                      ]}
                    />
                    <Pressable
                      onPress={() => updateQty(item.id, 1)}
                      disabled={item.qty >= item.stock}
                      style={[
                        styles.qtyButton,
                        { borderColor: theme.border },
                        item.qty >= item.stock && styles.qtyButtonDisabled,
                      ]}>
                      <ThemedText style={styles.qtyText}>+</ThemedText>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
            <View style={[styles.totalRow, { borderTopColor: theme.border }]}>
              <ThemedText style={[styles.totalLabel, { color: theme.muted }]}>Total</ThemedText>
              <ThemedText style={styles.totalValue}>{format(subtotal)}</ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">Payment</ThemedText>
          <View style={styles.paymentRow}>
            {paymentMethods.map((method) => (
              <Pressable
                key={method}
                onPress={() => setPaymentMethod(method)}
                style={[
                  styles.paymentChip,
                  {
                    backgroundColor: paymentMethod === method ? theme.primary : theme.surface,
                    borderColor: theme.border,
                  },
                ]}>
                <ThemedText
                  style={[
                    styles.paymentText,
                    { color: paymentMethod === method ? '#FFFFFF' : theme.text },
                  ]}>
                  {method}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          <View
            style={[
              styles.card,
              styles.paymentCard,
              { borderColor: theme.border, backgroundColor: theme.surface },
            ]}>
            <View style={styles.inputRow}>
              <ThemedText style={[styles.inputLabel, { color: theme.muted }]}>
                Amount received
              </ThemedText>
              <TextInput
                value={amountReceived}
                onChangeText={(value) => {
                  if (value.trim() === '') {
                    setAmountReceived('');
                    return;
                  }
                  const parsed = Number(value);
                  if (!Number.isFinite(parsed)) {
                    return;
                  }
                  const clamped = Math.min(parsed, subtotal);
                  if (parsed > subtotal && !amountWarnedRef.current) {
                    amountWarnedRef.current = true;
                    Alert.alert('Amount limit', 'Amount received cannot exceed the total.');
                  }
                  if (parsed <= subtotal) {
                    amountWarnedRef.current = false;
                  }
                  setAmountReceived(String(Math.floor(clamped)));
                }}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={theme.muted}
                style={[
                  styles.textInput,
                  { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text },
                ]}
              />
            </View>

            {paymentMethod === 'Pay Later' && (
              <View style={styles.inputGroup}>
                <View style={styles.inputRow}>
                  <ThemedText style={[styles.inputLabel, { color: theme.muted }]}>
                    Customer name
                  </ThemedText>
                  <TextInput
                    value={customerName}
                    onChangeText={setCustomerName}
                    placeholder="KudiBase Stores"
                    placeholderTextColor={theme.muted}
                    style={[
                      styles.textInput,
                      { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text },
                    ]}
                  />
                </View>
                <View style={styles.inputRow}>
                  <ThemedText style={[styles.inputLabel, { color: theme.muted }]}>
                    Phone number
                  </ThemedText>
                  <TextInput
                    value={customerPhone}
                    onChangeText={setCustomerPhone}
                    keyboardType="phone-pad"
                    placeholder="0803 000 0000"
                    placeholderTextColor={theme.muted}
                    style={[
                      styles.textInput,
                      { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text },
                    ]}
                  />
                </View>
                <View style={styles.inputRow}>
                  <ThemedText style={[styles.inputLabel, { color: theme.muted }]}>
                    Due date
                  </ThemedText>
                  <Pressable
                    onPress={() => setShowDueDatePicker(true)}
                    style={[
                      styles.dateField,
                      { borderColor: theme.border, backgroundColor: theme.surface },
                    ]}>
                    <ThemedText style={styles.dateFieldText}>
                      {formatDateLabel(dueDate)}
                    </ThemedText>
                  </Pressable>
                </View>
                <View style={styles.balanceRow}>
                  <ThemedText style={[styles.balanceLabel, { color: theme.muted }]}>
                    Balance due
                  </ThemedText>
                  <ThemedText style={styles.balanceValue}>{format(balanceDue)}</ThemedText>
                </View>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Pressable
            onPress={() => setShowBreakdown((prev) => !prev)}
            style={[
              styles.breakdownToggle,
              { borderColor: theme.border, backgroundColor: theme.surface },
            ]}>
            <ThemedText style={styles.breakdownToggleText}>
              {showBreakdown ? 'Hide' : 'Show'} payment breakdown
            </ThemedText>
          </Pressable>
          {showBreakdown && (
            <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
              {summary.byMethod.length === 0 ? (
                <View style={styles.emptyState}>
                  <ThemedText style={[styles.emptyText, { color: theme.muted }]}>
                    No sales recorded yet.
                  </ThemedText>
                </View>
              ) : (
                summary.byMethod.map((row, index) => (
                  <View
                    key={row.method}
                    style={[
                      styles.row,
                      index > 0 && [styles.rowDivider, { borderTopColor: theme.border }],
                    ]}>
                    <View>
                      <ThemedText style={styles.cartItemName}>{row.method}</ThemedText>
                      <ThemedText style={[styles.cartMeta, { color: theme.muted }]}>
                        {row.saleCount} sales
                      </ThemedText>
                    </View>
                    <View style={styles.breakdownValues}>
                      <ThemedText style={styles.breakdownValue}>
                        {format(row.totalSales)}
                      </ThemedText>
                      <ThemedText style={[styles.breakdownMeta, { color: theme.muted }]}>
                        {format(row.totalPaid)} collected
                      </ThemedText>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </View>

        <Pressable
          style={[styles.primaryButton, { backgroundColor: theme.primary }]}
          onPress={handleCompleteSale}>
          <ThemedText style={styles.primaryButtonText}>Complete sale</ThemedText>
        </Pressable>
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
  caption: { fontSize: 14 },
  section: { gap: 12 },
  itemGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  itemCard: {
    width: '48%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  itemCardDisabled: {
    opacity: 0.5,
  },
  itemName: { fontSize: 15 },
  itemMeta: { fontSize: 12 },
  itemButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  itemButtonText: { color: '#FFFFFF', fontSize: 12 },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 11,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  paymentCard: {
    padding: 16,
    gap: 12,
  },
  emptyState: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: { fontSize: 13 },
  summaryHeader: {
    gap: 10,
  },
  rangeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  rangeChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  customRangeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateChip: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateText: {
    fontSize: 12,
  },
  dateField: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  dateFieldText: {
    fontSize: 14,
  },
  breakdownToggle: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  breakdownToggleText: {
    fontSize: 13,
  },
  receiptsButton: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  receiptsButtonText: {
    fontSize: 13,
    color: '#0F6A3D',
  },
  linkChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  linkChipText: {
    fontSize: 12,
    color: '#0F6A3D',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalDone: {
    fontSize: 14,
    color: '#0F6A3D',
  },
  summaryRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  summaryBlock: {
    flex: 1,
    gap: 4,
  },
  summaryLabel: {
    fontSize: 12,
  },
  summaryValue: {
    fontSize: 16,
  },
  summaryMeta: {
    fontSize: 11,
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowDivider: { borderTopWidth: 1 },
  cartItemName: { fontSize: 15 },
  cartMeta: { fontSize: 12 },
  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyButtonDisabled: {
    opacity: 0.4,
  },
  qtyText: { fontSize: 16 },
  qtyInput: {
    minWidth: 56,
    width: 56,
    height: 32,
    borderWidth: 1,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 14,
    paddingHorizontal: 6,
    paddingVertical: 4,
    includeFontPadding: false,
  },
  totalRow: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: { fontSize: 12 },
  totalValue: { fontSize: 18 },
  breakdownValues: {
    alignItems: 'flex-end',
  },
  breakdownValue: {
    fontSize: 14,
  },
  breakdownMeta: {
    fontSize: 11,
  },
  paymentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  paymentChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  paymentText: { fontSize: 13 },
  inputRow: { gap: 6 },
  inputLabel: { fontSize: 12 },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'Sora-Regular',
  },
  inputGroup: {
    marginTop: 16,
    gap: 12,
  },
  balanceRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  balanceLabel: { fontSize: 12 },
  balanceValue: { fontSize: 16 },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16 },
});
