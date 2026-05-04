import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';

interface SummaryCardProps {
  theme: any;
  format: (value: number) => string;
  range: 'today' | 'week' | 'month' | 'custom';
  setRange: (range: 'today' | 'week' | 'month' | 'custom') => void;
  customStart: Date;
  customEnd: Date;
  setShowStartPicker: (show: boolean) => void;
  setShowEndPicker: (show: boolean) => void;
  summary: { totalSales: number; totalPaid: number; totalDue: number; saleCount: number };
  summaryBlockBasis: '31%' | '48%';
  formatDateLabel: (date: Date) => string;
}

export function SummaryCard({
  theme,
  format,
  range,
  setRange,
  customStart,
  customEnd,
  setShowStartPicker,
  setShowEndPicker,
  summary,
  summaryBlockBasis,
  formatDateLabel,
}: SummaryCardProps) {
  return (
    <View style={[styles.summaryCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      <View style={styles.rangeRow}>
        {(['today', 'week', 'month', 'custom'] as const).map((value) => (
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
              {value === 'today'
                ? 'Today'
                : value === 'week'
                  ? 'This week'
                  : value === 'month'
                    ? 'This month'
                    : 'Custom'}
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
      <View style={styles.summaryRow}>
        <View style={[styles.summaryBlock, { flexBasis: summaryBlockBasis }]}>
          <ThemedText style={[styles.summaryLabel, { color: theme.muted }]}>Total sales</ThemedText>
          <ThemedText
            style={styles.summaryValue}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}>
            {format(summary.totalSales)}
          </ThemedText>
          <ThemedText style={[styles.summaryMeta, { color: theme.muted }]}>
            {summary.saleCount} transactions
          </ThemedText>
        </View>
        <View style={[styles.summaryBlock, { flexBasis: summaryBlockBasis }]}>
          <ThemedText style={[styles.summaryLabel, { color: theme.muted }]}>Cash in</ThemedText>
          <ThemedText
            style={styles.summaryValue}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}>
            {format(summary.totalPaid)}
          </ThemedText>
          <ThemedText style={[styles.summaryMeta, { color: theme.muted }]}>Collected</ThemedText>
        </View>
        <View style={[styles.summaryBlock, { flexBasis: summaryBlockBasis }]}>
          <ThemedText style={[styles.summaryLabel, { color: theme.muted }]}>Outstanding</ThemedText>
          <ThemedText
            style={styles.summaryValue}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}>
            {format(summary.totalDue)}
          </ThemedText>
          <ThemedText style={[styles.summaryMeta, { color: theme.muted }]}>Pay later</ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  rangeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  rangeChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  customRangeRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  dateChip: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dateText: {
    fontSize: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryBlock: {
    gap: 6,
  },
  summaryLabel: { fontSize: 12 },
  summaryValue: { fontSize: 16 },
  summaryMeta: { fontSize: 11 },
});
