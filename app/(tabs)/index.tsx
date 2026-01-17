import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrency } from '@/hooks/use-currency';
import { getSalesSummary, initDb } from '@/lib/db';

const quickActions = [
  { title: 'New Sale', subtitle: 'Cash, transfer, POS', tone: 'primary' },
  { title: 'Add Stock', subtitle: 'Restock in seconds', tone: 'secondary' },
  { title: 'Debtors', subtitle: 'Collect unpaid balances', tone: 'accent' },
];

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

const inventoryPulse = [
  { name: 'Rice 25kg', status: 'Low stock • 4 left' },
  { name: '5L Palm Oil', status: 'Healthy • 18 left' },
  { name: 'Phone Charger', status: 'Low stock • 2 left' },
];

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { format } = useCurrency();
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

  const loadSummary = useCallback(async () => {
    await initDb();
    const { startMs, endMs } = getTodayRange();
    const summary = await getSalesSummary(startMs, endMs);
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

    const { startMs: weekStart, endMs: weekEnd } = getWeekRange();
    const weekSummary = await getSalesSummary(weekStart, weekEnd);
    setWeekStats({
      totalSales: weekSummary.totals.total_sales ?? 0,
      totalPaid: weekSummary.totals.total_paid ?? 0,
      totalDue: weekSummary.totals.total_due ?? 0,
      saleCount: weekSummary.totals.sale_count ?? 0,
    });
  }, []);

  useEffect(() => {
    loadSummary().catch((error) => console.error(error));
  }, [loadSummary]);

  useFocusEffect(
    useCallback(() => {
      loadSummary().catch((error) => console.error(error));
    }, [loadSummary])
  );

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

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.heroGlow, { backgroundColor: theme.secondary }]} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <Image source={require('@/assets/images/kudibase_logo.png')} style={styles.logo} />
            <View>
              <ThemedText type="subtitle" style={{ color: Colors.light.text }}>
                KudiBase
              </ThemedText>
              <ThemedText style={[styles.brandCaption, { color: Colors.light.text }]}>
                Your offline shop assistant
              </ThemedText>
            </View>
          </View>
          <Pressable style={[styles.pill, { backgroundColor: theme.surface }]}>
            <ThemedText style={styles.pillText}>Add business name</ThemedText>
          </Pressable>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">Quick actions</ThemedText>
          <View style={styles.quickGrid}>
            {quickActions.map((action) => {
              const isSecondary = action.tone === 'secondary';
              const titleColor = isSecondary ? theme.onSecondary : '#FFFFFF';
              const subtitleColor = isSecondary ? theme.onSecondary : '#FFFFFF';

              return (
              <View
                key={action.title}
                style={[
                  styles.actionCard,
                  {
                    backgroundColor:
                      action.tone === 'primary'
                        ? theme.primary
                        : action.tone === 'secondary'
                          ? theme.secondary
                          : theme.accent,
                  },
                ]}>
                <ThemedText style={[styles.actionTitle, { color: titleColor }]}>
                  {action.title}
                </ThemedText>
                <ThemedText style={[styles.actionSubtitle, { color: subtitleColor }]}>
                  {action.subtitle}
                </ThemedText>
              </View>
            );})}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">Today at a glance</ThemedText>
          <View style={styles.statsRow}>
            {todayStats.map((stat) => (
              <View
                key={stat.label}
                style={[
                  styles.statCard,
                  { borderColor: theme.border, backgroundColor: theme.surface },
                ]}>
                <ThemedText style={styles.statLabel}>{stat.label}</ThemedText>
                <ThemedText style={styles.statValue}>{stat.value}</ThemedText>
                <ThemedText style={styles.statNote}>{stat.note}</ThemedText>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">This week</ThemedText>
          <View style={styles.statsRow}>
            {weeklyStats.map((stat) => (
              <View
                key={stat.label}
                style={[
                  styles.statCard,
                  { borderColor: theme.border, backgroundColor: theme.surface },
                ]}>
                <ThemedText style={styles.statLabel}>{stat.label}</ThemedText>
                <ThemedText style={styles.statValue}>{stat.value}</ThemedText>
                <ThemedText style={styles.statNote}>{stat.note}</ThemedText>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">Inventory pulse</ThemedText>
          <View
            style={[
              styles.listCard,
              { borderColor: theme.border, backgroundColor: theme.surface },
            ]}>
            {inventoryPulse.map((item, index) => (
              <View
                key={item.name}
                style={[styles.listRow, index > 0 && [styles.rowDivider, { borderTopColor: theme.border }]]}>
                <ThemedText style={styles.listTitle}>{item.name}</ThemedText>
                <ThemedText style={styles.listMeta}>{item.status}</ThemedText>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroGlow: {
    position: 'absolute',
    top: -120,
    left: -40,
    right: -40,
    height: 280,
    borderBottomLeftRadius: 180,
    borderBottomRightRadius: 180,
    opacity: 0.8,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 24,
  },
  header: {
    gap: 14,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 16,
  },
  brandCaption: {
    fontSize: 14,
    opacity: 0.8,
  },
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  pillText: {
    fontSize: 13,
    opacity: 0.75,
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
    flexBasis: '48%',
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
    flexBasis: '31%',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.6,
  },
  statValue: {
    fontSize: 18,
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
});
