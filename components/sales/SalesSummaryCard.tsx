import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrency } from '@/hooks/use-currency';
import { SalesSummary } from './types';

type DateRange = 'today' | 'week' | 'custom';

type Props = {
    summary: SalesSummary;
    range: DateRange;
    customStart: Date;
    customEnd: Date;
    onRangeChange: (range: DateRange) => void;
    onCustomStartChange: (date: Date) => void;
    onCustomEndChange: (date: Date) => void;
};

function formatDateLabel(date: Date) {
    return date.toLocaleDateString('en-NG', { day: '2-digit', month: 'short' });
}

export function SalesSummaryCard({
    summary,
    range,
    customStart,
    customEnd,
    onRangeChange,
    onCustomStartChange,
    onCustomEndChange,
}: Props) {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { format } = useCurrency();
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    return (
        <View style={styles.container}>
            <View style={styles.summaryHeader}>
                <ThemedText type="subtitle">Sales summary</ThemedText>
            </View>
            <View style={styles.rangeRow}>
                {(['today', 'week', 'custom'] as const).map((value) => (
                    <Pressable
                        key={value}
                        onPress={() => onRangeChange(value)}
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

            {showStartPicker && Platform.OS !== 'ios' && (
                <DateTimePicker
                    value={customStart}
                    mode="date"
                    display="default"
                    themeVariant={colorScheme === 'dark' ? 'dark' : 'light'}
                    onChange={(_event, date) => {
                        setShowStartPicker(false);
                        if (date) {
                            const next = new Date(date);
                            next.setHours(0, 0, 0, 0);
                            onCustomStartChange(next);
                        }
                    }}
                />
            )}
            {showStartPicker && Platform.OS === 'ios' && (
                <Modal transparent animationType="fade" onRequestClose={() => setShowStartPicker(false)}>
                    <Pressable style={styles.modalBackdrop} onPress={() => setShowStartPicker(false)}>
                        <Pressable style={[styles.modalCard, { backgroundColor: theme.surface }]}>
                            <View style={styles.modalHeader}>
                                <ThemedText type="subtitle">Select start date</ThemedText>
                                <Pressable onPress={() => setShowStartPicker(false)}>
                                    <ThemedText style={styles.modalDone}>Done</ThemedText>
                                </Pressable>
                            </View>
                            <DateTimePicker
                                value={customStart}
                                mode="date"
                                display="spinner"
                                textColor={theme.text}
                                themeVariant={colorScheme === 'dark' ? 'dark' : 'light'}
                                onChange={(_event, date) => {
                                    if (date) {
                                        const next = new Date(date);
                                        next.setHours(0, 0, 0, 0);
                                        onCustomStartChange(next);
                                    }
                                }}
                            />
                        </Pressable>
                    </Pressable>
                </Modal>
            )}
            {showEndPicker && Platform.OS !== 'ios' && (
                <DateTimePicker
                    value={customEnd}
                    mode="date"
                    display="default"
                    themeVariant={colorScheme === 'dark' ? 'dark' : 'light'}
                    onChange={(_event, date) => {
                        setShowEndPicker(false);
                        if (date) {
                            const next = new Date(date);
                            next.setHours(23, 59, 59, 999);
                            onCustomEndChange(next);
                        }
                    }}
                />
            )}
            {showEndPicker && Platform.OS === 'ios' && (
                <Modal transparent animationType="fade" onRequestClose={() => setShowEndPicker(false)}>
                    <Pressable style={styles.modalBackdrop} onPress={() => setShowEndPicker(false)}>
                        <Pressable style={[styles.modalCard, { backgroundColor: theme.surface }]}>
                            <View style={styles.modalHeader}>
                                <ThemedText type="subtitle">Select end date</ThemedText>
                                <Pressable onPress={() => setShowEndPicker(false)}>
                                    <ThemedText style={styles.modalDone}>Done</ThemedText>
                                </Pressable>
                            </View>
                            <DateTimePicker
                                value={customEnd}
                                mode="date"
                                display="spinner"
                                textColor={theme.text}
                                themeVariant={colorScheme === 'dark' ? 'dark' : 'light'}
                                onChange={(_event, date) => {
                                    if (date) {
                                        const next = new Date(date);
                                        next.setHours(23, 59, 59, 999);
                                        onCustomEndChange(next);
                                    }
                                }}
                            />
                        </Pressable>
                    </Pressable>
                </Modal>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { gap: 12 },
    summaryHeader: { gap: 10 },
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
    dateText: { fontSize: 12 },
    card: {
        borderWidth: 1,
        borderRadius: 16,
        overflow: 'hidden',
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
    summaryLabel: { fontSize: 12 },
    summaryValue: { fontSize: 16 },
    summaryMeta: { fontSize: 11 },
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
});
