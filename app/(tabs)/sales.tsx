import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import * as Contacts from 'expo-contacts';

import {
  CartView,
  PayLaterForm,
  PaymentBreakdown,
  PaymentMethodPicker,
  QuickAddGrid,
  SalesSummaryCard,
  type CartItem,
  type Item,
  type PaymentMethod,
  type SalesSummary,
} from '@/components/sales';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getItems, getRecentCustomers, getSalesSummary, initDb, recordSale } from '@/lib/db';

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

export default function SalesScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const router = useRouter();
  const scrollRef = useRef<ScrollView | null>(null);
  const scrollYRef = useRef(0);
  const scrollViewHeightRef = useRef(0);
  const cartLayoutRef = useRef<{ y: number; height: number } | null>(null);

  // Items state
  const [items, setItems] = useState<Item[]>([]);
  const [quickSearch, setQuickSearch] = useState('');
  const [showAllQuick, setShowAllQuick] = useState(false);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [qtyInputs, setQtyInputs] = useState<Record<string, string>>({});
  const qtyWarnedRef = useRef<Record<string, boolean>>({});

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [showCustomerDetails, setShowCustomerDetails] = useState(true);
  const [lastNonPayLaterExpanded, setLastNonPayLaterExpanded] = useState(true);
  const [recentCustomers, setRecentCustomers] = useState<Array<{ name: string; phone: string | null }>>([]);
  const [contactsVisible, setContactsVisible] = useState(false);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsList, setContactsList] = useState<Array<{ id: string; name: string; phone: string }>>([]);
  const [contactsHasNext, setContactsHasNext] = useState(false);
  const [contactsPageOffset, setContactsPageOffset] = useState(0);
  const [contactsLoadingMore, setContactsLoadingMore] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date;
  });

  // Summary state
  const [summary, setSummary] = useState<SalesSummary>({
    totalSales: 0,
    totalPaid: 0,
    totalDue: 0,
    saleCount: 0,
    byMethod: [],
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
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Computed values
  const cartQuantities = useMemo(() => {
    return cart.reduce<Record<string, number>>((acc, item) => {
      acc[item.id] = item.qty;
      return acc;
    }, {});
  }, [cart]);

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  }, [cart]);

  const balanceDue = useMemo(() => {
    const paid = parseNumberInput(amountReceived);
    if (paymentMethod === 'Pay Later') {
      return subtotal - paid;
    }
    return 0;
  }, [paymentMethod, amountReceived, subtotal]);

  // Data loading
  const loadItems = useCallback(async () => {
    await initDb();
    const rows = await getItems();
    setItems(
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        price: row.price,
        cost: row.cost_price ?? 0,
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

  const loadRecentCustomers = useCallback(async () => {
    await initDb();
    const rows = await getRecentCustomers(8);
    setRecentCustomers(
      rows.map((row) => ({
        name: row.customer_name ?? 'Customer',
        phone: row.customer_phone ?? null,
      }))
    );
  }, []);

  useEffect(() => {
    loadItems().catch((error) => {
      Alert.alert('Setup error', 'Unable to load inventory data.');
      console.error(error);
    });
    loadSummary().catch((error) => {
      Alert.alert('Setup error', 'Unable to load sales summary.');
      console.error(error);
    });
    loadRecentCustomers().catch(() => {});
  }, [loadItems, loadRecentCustomers, loadSummary]);

  useEffect(() => {
    setQtyInputs((prev) => {
      const next: Record<string, string> = {};
      cart.forEach((item) => {
        next[item.id] = prev[item.id] ?? String(item.qty);
      });
      return next;
    });
  }, [cart]);

  useEffect(() => {
    if (paymentMethod === 'Pay Later') {
      setLastNonPayLaterExpanded((prev) => (showCustomerDetails ? true : prev));
      setShowCustomerDetails(false);
    } else {
      setShowCustomerDetails(lastNonPayLaterExpanded);
    }
  }, [lastNonPayLaterExpanded, paymentMethod]);

  const filteredContacts = useMemo(() => {
    const term = contactSearch.trim().toLowerCase();
    if (!term) return contactsList;
    const digits = term.replace(/[^\d]/g, '');
    return contactsList.filter((contact) => {
      const nameMatch = contact.name.toLowerCase().includes(term);
      if (nameMatch) return true;
      if (!digits) return false;
      const phoneDigits = contact.phone.replace(/[^\d]/g, '');
      return phoneDigits.includes(digits);
    });
  }, [contactSearch, contactsList]);

  useEffect(() => {
    if (!contactSearch.trim()) return;
    if (filteredContacts.length > 0) return;
    if (!contactsHasNext || contactsLoadingMore) return;
    handleLoadMoreContacts().catch(() => {});
  }, [contactSearch, contactsHasNext, contactsLoadingMore, filteredContacts.length]);

  async function loadContactsPage(offset: number, limit: number = 200) {
    const { data, hasNextPage } = await Contacts.getContactsAsync({
      pageSize: limit,
      pageOffset: offset,
      fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
      sort: Contacts.SortTypes.FirstName,
    });
    const batch = data
      .map((contact) => {
        const phone = contact.phoneNumbers?.find((entry) => entry.number)?.number ?? '';
        return {
          id: String(contact.id),
          name: contact.name ?? 'Unknown',
          phone: phone.replace(/\s+/g, ' ').trim(),
        };
      })
      .filter((contact) => contact.phone.length > 0);
    return { batch, hasNextPage };
  }

  async function handlePickContact() {
    try {
      setContactsLoading(true);
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow contacts access to pick a customer.');
        return;
      }
      const { batch, hasNextPage } = await loadContactsPage(0);
      setContactsList(batch);
      setContactsHasNext(Boolean(hasNextPage));
      setContactsPageOffset(batch.length);
      setContactsVisible(true);
    } catch (error) {
      Alert.alert('Contacts error', 'Unable to load contacts.');
      console.error(error);
    } finally {
      setContactsLoading(false);
    }
  }

  async function handleLoadMoreContacts() {
    if (contactsLoadingMore || !contactsHasNext) return;
    try {
      setContactsLoadingMore(true);
      const { batch, hasNextPage } = await loadContactsPage(contactsPageOffset);
      setContactsList((prev) => [...prev, ...batch]);
      setContactsHasNext(Boolean(hasNextPage));
      setContactsPageOffset((prev) => prev + batch.length);
    } catch (error) {
      Alert.alert('Contacts error', 'Unable to load more contacts.');
      console.error(error);
    } finally {
      setContactsLoadingMore(false);
    }
  }

  function handleSelectCustomer(name: string, phone?: string | null) {
    setCustomerName(name);
    setCustomerPhone(phone ?? '');
    if (paymentMethod !== 'Pay Later') {
      setShowCustomerDetails(true);
    }
  }

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
      loadRecentCustomers().catch(() => {});
    }, [loadItems, loadRecentCustomers, loadSummary])
  );

  // Cart handlers
  function scrollToCart() {
    const layout = cartLayoutRef.current;
    if (!layout) return;
    const scrollY = scrollYRef.current;
    const viewHeight = scrollViewHeightRef.current;
    const isVisible = scrollY <= layout.y && scrollY + viewHeight >= layout.y + layout.height;
    if (isVisible) return;
    scrollRef.current?.scrollTo({ y: Math.max(layout.y - 12, 0), animated: true });
  }

  function addToCart(item: Item) {
    setCart((prev) => {
      const existing = prev.find((entry) => entry.id === item.id);
      if (existing && existing.qty >= item.stock) return prev;
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
    setCart((prev) => {
      const next = prev
        .map((entry) => {
          if (entry.id !== itemId) return entry;
          const nextQty = Math.max(0, entry.qty + delta);
          return { ...entry, qty: Math.min(nextQty, entry.stock) };
        })
        .filter((entry) => entry.qty > 0);
      setQtyInputs((prevInputs) => {
        const updated = { ...prevInputs };
        const updatedItem = next.find((entry) => entry.id === itemId);
        if (!updatedItem) {
          delete updated[itemId];
        } else {
          updated[itemId] = String(updatedItem.qty);
        }
        return updated;
      });
      return next;
    });
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

  // Sale completion
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
        ? parseNumberInput(amountReceived)
        : amountReceived
          ? parseNumberInput(amountReceived)
          : subtotal;
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
          cost: row.cost_price ?? 0,
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
      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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

          <SalesSummaryCard
            summary={summary}
            range={range}
            customStart={customStart}
            customEnd={customEnd}
            onRangeChange={setRange}
            onCustomStartChange={setCustomStart}
            onCustomEndChange={setCustomEnd}
          />

          <Pressable
            onPress={() => router.push('/receipts')}
            style={[styles.receiptsButton, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <ThemedText style={styles.receiptsButtonText}>View receipt history</ThemedText>
          </Pressable>

          <QuickAddGrid
            items={items}
            cartQuantities={cartQuantities}
            searchQuery={quickSearch}
            showAll={showAllQuick}
            onSearchChange={setQuickSearch}
            onShowAllToggle={() => setShowAllQuick((prev) => !prev)}
            onAddToCart={addToCart}
          />

          <CartView
            cart={cart}
            qtyInputs={qtyInputs}
            subtotal={subtotal}
            onUpdateQty={updateQty}
            onQtyInputChange={updateQtyInput}
            onQtyInputBlur={commitQtyInput}
            onLayout={(event) => {
              const { y, height } = event.nativeEvent.layout;
              cartLayoutRef.current = { y, height };
            }}
          />

          {paymentMethod !== 'Pay Later' && (
            <View style={[styles.customerCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
              <Pressable
                onPress={() => setShowCustomerDetails((prev) => !prev)}
                style={styles.customerHeader}
                accessibilityRole="button">
                <View>
                  <ThemedText style={styles.customerTitle}>Customer details (optional)</ThemedText>
                  <ThemedText style={[styles.customerSubtitle, { color: theme.muted }]}>
                    {customerName.trim()
                      ? customerName
                      : customerPhone.trim()
                        ? customerPhone
                        : 'Add customer name or phone'}
                  </ThemedText>
                </View>
                <View style={[styles.chevron, { borderColor: theme.border }]}>
                  <ThemedText style={styles.chevronText}>{showCustomerDetails ? '−' : '+'}</ThemedText>
                </View>
              </Pressable>

              {showCustomerDetails && (
                <View style={styles.customerFields}>
                  <Pressable
                    onPress={handlePickContact}
                    style={[styles.contactButton, { borderColor: theme.border }]}>
                    <ThemedText style={styles.contactButtonText}>
                      {contactsLoading ? 'Loading contacts...' : 'Pick from contacts'}
                    </ThemedText>
                  </Pressable>
                  <View style={styles.inputRow}>
                    <ThemedText style={[styles.inputLabel, { color: theme.muted }]}>Customer name</ThemedText>
                    <TextInput
                      value={customerName}
                      onChangeText={setCustomerName}
                      placeholder="e.g. Amina Yusuf"
                      placeholderTextColor={theme.muted}
                      style={[
                        styles.textInput,
                        { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text },
                      ]}
                    />
                  </View>
                  <View style={styles.inputRow}>
                    <ThemedText style={[styles.inputLabel, { color: theme.muted }]}>Phone number</ThemedText>
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
                  {recentCustomers.length > 0 ? (
                    <View style={styles.recentBlock}>
                      <ThemedText style={[styles.inputLabel, { color: theme.muted }]}>Recent customers</ThemedText>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {recentCustomers.map((customer) => (
                          <Pressable
                            key={`${customer.name}-${customer.phone ?? ''}`}
                            onPress={() => handleSelectCustomer(customer.name, customer.phone)}
                            style={[styles.recentChip, { borderColor: theme.border, backgroundColor: theme.surface }]}>
                            <ThemedText style={styles.recentChipText}>{customer.name}</ThemedText>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  ) : null}
                </View>
              )}
            </View>
          )}

          <PaymentMethodPicker selected={paymentMethod} onSelect={setPaymentMethod} />

          {paymentMethod === 'Pay Later' && (
            <PayLaterForm
              customerName={customerName}
              customerPhone={customerPhone}
              dueDate={dueDate}
              balanceDue={balanceDue}
              amountReceived={amountReceived}
              subtotal={subtotal}
              onCustomerNameChange={setCustomerName}
              onCustomerPhoneChange={setCustomerPhone}
              onDueDateChange={setDueDate}
              onAmountReceivedChange={setAmountReceived}
              onPickContact={handlePickContact}
              recentCustomers={recentCustomers}
              onSelectRecent={handleSelectCustomer}
            />
          )}

          <PaymentBreakdown
            byMethod={summary.byMethod}
            visible={showBreakdown}
            onToggle={() => setShowBreakdown((prev) => !prev)}
          />

          <Pressable
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}
            onPress={handleCompleteSale}>
            <ThemedText style={styles.primaryButtonText}>Complete sale</ThemedText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal visible={contactsVisible} transparent animationType="fade" onRequestClose={() => setContactsVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setContactsVisible(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">Pick a contact</ThemedText>
              <Pressable onPress={() => setContactsVisible(false)}>
                <ThemedText style={styles.modalDone}>Done</ThemedText>
              </Pressable>
            </View>
            <TextInput
              value={contactSearch}
              onChangeText={setContactSearch}
              placeholder="Search contacts"
              placeholderTextColor={theme.muted}
              style={[
                styles.searchInput,
                { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text },
              ]}
            />
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.contactsList}
              scrollEventThrottle={16}
              onScroll={({ nativeEvent }) => {
                const paddingToBottom = 32;
                const atBottom =
                  nativeEvent.layoutMeasurement.height + nativeEvent.contentOffset.y >=
                  nativeEvent.contentSize.height - paddingToBottom;
                if (atBottom) {
                  handleLoadMoreContacts();
                }
              }}>
              {filteredContacts.length === 0 ? (
                <ThemedText style={[styles.emptyText, { color: theme.muted }]}>
                  {contactsHasNext ? 'Searching more contacts…' : 'No contacts found.'}
                </ThemedText>
              ) : (
                filteredContacts.map((contact, index) => (
                  <Pressable
                    key={`${contact.id}-${index}`}
                    onPress={() => {
                      handleSelectCustomer(contact.name, contact.phone);
                      setContactsVisible(false);
                    }}
                    style={[styles.contactRow, { borderColor: theme.border }]}>
                    <View>
                      <ThemedText style={styles.contactName}>{contact.name}</ThemedText>
                      <ThemedText style={[styles.contactPhone, { color: theme.muted }]}>
                        {contact.phone}
                      </ThemedText>
                    </View>
                  </Pressable>
                ))
              )}
            </ScrollView>
            {contactsHasNext && !contactsLoadingMore ? (
              <Pressable
                onPress={handleLoadMoreContacts}
                style={styles.loadMoreHint}>
                <ThemedText style={[styles.loadMoreText, { color: theme.muted }]}>
                  Scroll or tap to load more
                </ThemedText>
              </Pressable>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardWrap: { flex: 1 },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 24,
  },
  header: { gap: 8 },
  caption: { fontSize: 14 },
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
  customerCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  customerTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  customerSubtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  customerFields: {
    gap: 12,
  },
  chevron: {
    borderWidth: 1,
    borderRadius: 999,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronText: {
    fontSize: 18,
    lineHeight: 20,
  },
  inputRow: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'Sora-Regular',
  },
  contactButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  contactButtonText: {
    fontSize: 13,
    color: '#0F6A3D',
  },
  recentBlock: {
    gap: 8,
  },
  recentChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  recentChipText: {
    fontSize: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 16,
    padding: 16,
    maxHeight: '80%',
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalDone: {
    color: '#0F6A3D',
    fontWeight: '600',
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: 'Sora-Regular',
  },
  contactsList: {
    gap: 8,
    paddingBottom: 8,
  },
  contactRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  contactName: {
    fontSize: 14,
    fontWeight: '600',
  },
  contactPhone: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 12,
  },
  loadMoreHint: {
    alignItems: 'center',
    paddingTop: 6,
  },
  loadMoreText: {
    fontSize: 12,
  },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16 },
});
