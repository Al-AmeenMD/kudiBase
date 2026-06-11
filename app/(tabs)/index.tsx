import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, Pressable, useWindowDimensions } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { EmptyState } from '@/components/empty-state';
import { HomeSkeleton } from '@/components/loading-skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrency } from '@/hooks/use-currency';
import { getBusinessProfile, getDeadStockItems, getItems, getOutstandingSales, getSalesSummary, initDb } from '@/lib/db';
import { getTodayRange, getWeekRange } from '@/lib/date-utils';
import { subscribeDbEvents } from '@/lib/db/events';
import { subscribeSettings } from '@/lib/settings-events';
import { isPremium } from '@/lib/subscription';

const quickActions = [
  { title: 'New Sale', subtitle: 'Cash, transfer, POS', tone: 'primary', route: '/sales' },
  { title: 'Add Stock', subtitle: 'Restock in seconds', tone: 'secondary', route: '/inventory-item' },
  { title: 'Records', subtitle: 'Track all sales', tone: 'accent', route: '/records' },
  { title: 'Debtors', subtitle: 'Collect unpaid balances', tone: 'danger', route: '/debts' },
];

const lowStockThreshold = 5;

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { format } = useCurrency();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalPaid: 0,
    totalDue: 0,
    saleCount: 0,
    byMethod: [] as Array<{ method: string; totalSales: number }>,
  });
  const [weekStats, setWeekStats] = useState({
    totalSales: 0,
    totalPaid: 0,
    totalDue: 0,
    saleCount: 0,
  });
  const [businessName, setBusinessName] = useState('Add business name');
  const [businessLogoUri, setBusinessLogoUri] = useState<string | null>(null);
  const [lowStockItems, setLowStockItems] = useState<Array<{ id: string; name: string; stock: number }>>([]);
  const [topDebtors, setTopDebtors] = useState<
    Array<{ id: string; name: string; amount: number; dueDate?: string | null }>
  >([]);
  const [deadStock, setDeadStock] = useState<Array<{ id: string; name: string; stock: number; days: number }>>([]);
  const [premium, setPremium] = useState(false);

  const loadSummary = useCallback(async () => {
    await initDb();
    const { startMs, endMs } = getTodayRange();
    const [summary, profile, items, debts] = await Promise.all([
      getSalesSummary(startMs, endMs),
      getBusinessProfile(),
      getItems(),
      getOutstandingSales(),
    ]);
    setStats({
      totalSales: summary.totals.total_sales ?? 0,
      totalPaid: summary.totals.total_paid ?? 0,
      totalDue: summary.totals.total_due ?? 0,
      saleCount: summary.totals.sale_count ?? 0,
      byMethod: summary.byMethod.map((row) => ({
        method: row.payment_method,
        totalSales: row.total_sales ?? 0,
      })),
    });
    setBusinessName(profile?.business_name?.trim() || 'Add business name');
    setBusinessLogoUri(profile?.logo_path ?? null);
    const lowStock = items
      .filter((item) => item.stock_qty <= lowStockThreshold)
      .map((item) => ({ id: item.id, name: item.name, stock: item.stock_qty }))
      .sort((a, b) => a.stock - b.stock);
    setLowStockItems(lowStock);
    const top = debts
      .map((row) => ({
        id: row.id,
        name: row.customer_name ?? `Sale #${row.sale_number}`,
        amount: row.balance_due,
        dueDate: row.due_date,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);
    setTopDebtors(top);
    let premiumStatus = false;
    try {
      premiumStatus = await isPremium();
    } catch {
      premiumStatus = false;
    }
    setPremium(premiumStatus);

    if (premiumStatus) {
      const deadRows = await getDeadStockItems(Date.now() - 1000 * 60 * 60 * 24 * 30, 3);
      const now = Date.now();
      setDeadStock(
        deadRows.map((row) => ({
          id: row.id,
          name: row.name,
          stock: row.stock_qty,
          days: row.last_sold_at ? Math.floor((now - row.last_sold_at) / (1000 * 60 * 60 * 24)) : 999,
        }))
      );
    } else {
      setDeadStock([]);
    }

    const { startMs: weekStart, endMs: weekEnd } = getWeekRange();
    const weekSummary = await getSalesSummary(weekStart, weekEnd);
    setWeekStats({
      totalSales: weekSummary.totals.total_sales ?? 0,
      totalPaid: weekSummary.totals.total_paid ?? 0,
      totalDue: weekSummary.totals.total_due ?? 0,
      saleCount: weekSummary.totals.sale_count ?? 0,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeSettings((key, value) => {
      if (key === 'business_profile') {
        const next = value?.trim() || 'Add business name';
        setBusinessName(next);
        loadSummary().catch(() => {});
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeDbEvents((event) => {
      if (event === 'sales' || event === 'profile') {
        loadSummary().catch(() => {});
      }
    });
    return unsubscribe;
  }, [loadSummary]);

  useFocusEffect(
    useCallback(() => {
      loadSummary().catch(() => {});
    }, [loadSummary])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadSummary();
    } catch {
      // silently ignore
    } finally {
      setRefreshing(false);
    }
  }, [loadSummary]);

  const todayStats = [
    { label: 'Sales', value: format(stats.totalSales), note: `${stats.saleCount} transactions` },
    { label: 'Cash In', value: format(stats.totalPaid), note: 'Collected' },
    { label: 'Debts', value: format(stats.totalDue), note: 'Outstanding' },
  ];
  const weeklyStats = [
    {
      label: 'Week Sales',
      value: format(weekStats.totalSales),
      note: `${weekStats.saleCount} transactions`,
    },
    { label: 'Week Cash', value: format(weekStats.totalPaid), note: 'Collected' },
    { label: 'Week Debts', value: format(weekStats.totalDue), note: 'Outstanding' },
  ];

  const quickActionBasis = width >= 900 ? '23%' : width >= 600 ? '31%' : '48%';
  const statColumns = width >= 900 ? 3 : 2;
  const statCardBasis = statColumns === 3 ? '31%' : '48%';
  const hasBusinessName = businessName !== 'Add business name';

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }>
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerCopy}>
              <ThemedText type="subtitle" style={styles.businessTitle}>
                {hasBusinessName ? businessName : 'Set up your business'}
              </ThemedText>
            </View>
            <Pressable
              onPress={() => router.push('/profile')}
              android_ripple={{ color: 'rgba(15,106,61,0.12)', borderless: false }}
              style={({ pressed }) => [
                styles.profileButton,
                { borderColor: theme.border, backgroundColor: colorScheme === 'light' ? '#F9F6EF' : theme.background },
                pressed && styles.pressed,
              ]}>
              {businessLogoUri ? (
                <Image source={{ uri: businessLogoUri }} style={styles.profileLogo} />
              ) : (
                <ThemedText style={[styles.profileInitial, { color: theme.primaryDeep }]}>
                  {(hasBusinessName ? businessName : 'K')[0]?.toUpperCase()}
                </ThemedText>
              )}
            </Pressable>
          </View>
        </View>

        {loading ? (
          <HomeSkeleton />
        ) : (
          <>
            <View style={styles.section}>
              <ThemedText type="subtitle">Quick actions</ThemedText>
              <View style={styles.quickGrid}>
                {quickActions.map((action) => {
                  const isSecondary = action.tone === 'secondary';
                  const titleColor = isSecondary ? theme.onSecondary : '#FFFFFF';
                  const subtitleColor = isSecondary ? theme.onSecondary : '#FFFFFF';
                  const cardColor =
                    action.tone === 'primary'
                      ? theme.primary
                      : action.tone === 'secondary'
                        ? theme.secondary
                        : action.tone === 'danger'
                          ? '#D64545'
                          : theme.accent;

                  return (
                  <Pressable
                    key={action.title}
                    onPress={() => router.push(action.route as any)}
                    android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
                    style={({ pressed }) => [
                      styles.actionCard,
                      {
                        flexBasis: quickActionBasis,
                        maxWidth: quickActionBasis,
                        flexGrow: 0,
                        backgroundColor: cardColor,
                      },
                      pressed && styles.pressed,
                    ]}>
                    <ThemedText style={[styles.actionTitle, { color: titleColor }]}>
                      {action.title}
                    </ThemedText>
                    <ThemedText style={[styles.actionSubtitle, { color: subtitleColor }]}>
                      {action.subtitle}
                    </ThemedText>
                  </Pressable>
                );})}
              </View>
            </View>

            <View style={styles.section}>
              <ThemedText type="subtitle">Today at a glance</ThemedText>
              <View style={styles.statsRow}>
                {todayStats.map((stat, index) => (
                  <View
                    key={stat.label}
                    style={[
                      styles.statCard,
                      { borderColor: theme.border, backgroundColor: theme.surface },
                      statColumns === 2 && index === todayStats.length - 1
                        ? styles.statCardFull
                        : { flexBasis: statCardBasis },
                    ]}>
                    <ThemedText style={styles.statLabel}>{stat.label}</ThemedText>
                    <ThemedText
                      style={styles.statValue}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.7}>
                      {stat.value}
                    </ThemedText>
                    <ThemedText style={styles.statNote}>{stat.note}</ThemedText>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <ThemedText type="subtitle">This week</ThemedText>
              <View style={styles.statsRow}>
                {weeklyStats.map((stat, index) => (
                  <View
                    key={stat.label}
                    style={[
                      styles.statCard,
                      { borderColor: theme.border, backgroundColor: theme.surface },
                      statColumns === 2 && index === weeklyStats.length - 1
                        ? styles.statCardFull
                        : { flexBasis: statCardBasis },
                    ]}>
                    <ThemedText style={styles.statLabel}>{stat.label}</ThemedText>
                    <ThemedText
                      style={styles.statValue}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.7}>
                      {stat.value}
                    </ThemedText>
                    <ThemedText style={styles.statNote}>{stat.note}</ThemedText>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <ThemedText type="subtitle">Low stock items</ThemedText>
              <View
                style={[
                  styles.listCard,
                  { borderColor: theme.border, backgroundColor: theme.surface },
                ]}>
                {lowStockItems.length === 0 ? (
                  <EmptyState
                    icon="archivebox.fill"
                    title="No low stock items"
                    subtitle="All your items are well stocked."
                  />
                ) : (
                  lowStockItems.map((item, index) => (
                    <Pressable
                      key={item.id}
                      onPress={() => router.push({ pathname: '/inventory-item', params: { id: item.id } })}
                      android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
                      style={({ pressed }) => [
                        styles.listRow,
                        index > 0 && [styles.rowDivider, { borderTopColor: theme.border }],
                        pressed && styles.pressed,
                      ]}>
                      <ThemedText style={styles.listTitle}>{item.name}</ThemedText>
                      <ThemedText style={styles.listMeta}>Low stock • {item.stock} left</ThemedText>
                    </Pressable>
                  ))
                )}
              </View>
            </View>

            {premium ? (
              <View style={styles.section}>
                <ThemedText type="subtitle">Dead stock alerts</ThemedText>
                <View
                  style={[
                    styles.listCard,
                    { borderColor: theme.border, backgroundColor: theme.surface },
                  ]}>
                  {deadStock.length === 0 ? (
                    <EmptyState
                      icon="cube.fill"
                      title="No stale inventory"
                      subtitle="All items are selling regularly."
                    />
                  ) : (
                    deadStock.map((item, index) => (
                      <Pressable
                        key={item.id}
                        onPress={() => router.push({ pathname: '/inventory-item', params: { id: item.id } })}
                        android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
                        style={({ pressed }) => [
                          styles.listRow,
                          index > 0 && [styles.rowDivider, { borderTopColor: theme.border }],
                          pressed && styles.pressed,
                        ]}>
                        <ThemedText style={styles.listTitle}>{item.name}</ThemedText>
                        <ThemedText style={styles.listMeta}>
                          {item.stock} left • {item.days >= 999 ? 'Never sold' : `${item.days} days`}
                        </ThemedText>
                      </Pressable>
                    ))
                  )}
                </View>
              </View>
            ) : null}

            <View style={styles.section}>
              <ThemedText type="subtitle">Top debtors</ThemedText>
              <View
                style={[
                  styles.listCard,
                  { borderColor: theme.border, backgroundColor: theme.surface },
                ]}>
                {topDebtors.length === 0 ? (
                  <EmptyState
                    icon="person.2.fill"
                    title="No outstanding debts"
                    subtitle="All your customers are paid up."
                  />
                ) : (
                  topDebtors.map((debtor, index) => (
                    <Pressable
                      key={debtor.id}
                      onPress={() => router.push('/debts')}
                      android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
                      style={({ pressed }) => [
                        styles.listRow,
                        index > 0 && [styles.rowDivider, { borderTopColor: theme.border }],
                        pressed && styles.pressed,
                      ]}>
                      <ThemedText style={styles.listTitle}>{debtor.name}</ThemedText>
                      <ThemedText style={styles.listMeta}>{format(debtor.amount)}</ThemedText>
                    </Pressable>
                  ))
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 24,
  },
  header: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  businessTitle: {
    fontSize: 22,
    lineHeight: 28,
    flexShrink: 1,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  profileLogo: {
    width: '100%',
    height: '100%',
  },
  profileInitial: {
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
  section: {
    gap: 12,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    borderRadius: 16,
    padding: 16,
    minHeight: 96,
    justifyContent: 'space-between',
  },
  actionTitle: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.85,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    minWidth: 140,
  },
  statCardFull: {
    flexBasis: '100%',
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.6,
  },
  statValue: {
    fontSize: 18,
    flexShrink: 1,
  },
  statNote: {
    fontSize: 11,
    opacity: 0.5,
  },
  listCard: {
    borderWidth: 1,
    borderRadius: 16,
  },
  listRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
  },
  rowDivider: {
    borderTopWidth: 1,
  },
  listTitle: {
    fontSize: 15,
  },
  listMeta: {
    fontSize: 12,
    opacity: 0.6,
  },
  emptyWrap: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  premiumCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  premiumButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  premiumButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
