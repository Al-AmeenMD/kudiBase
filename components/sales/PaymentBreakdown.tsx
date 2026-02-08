import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrency } from '@/hooks/use-currency';

type PaymentMethodSummary = {
    method: string;
    totalSales: number;
    totalPaid: number;
    saleCount: number;
};

type Props = {
    byMethod: PaymentMethodSummary[];
    visible: boolean;
    onToggle: () => void;
};

export function PaymentBreakdown({ byMethod, visible, onToggle }: Props) {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { format } = useCurrency();

    return (
        <View style={styles.container}>
            <Pressable
                onPress={onToggle}
                style={[
                    styles.breakdownToggle,
                    { borderColor: theme.border, backgroundColor: theme.surface },
                ]}>
                <ThemedText style={styles.breakdownToggleText}>
                    {visible ? 'Hide' : 'Show'} payment breakdown
                </ThemedText>
            </Pressable>
            {visible && (
                <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
                    {byMethod.length === 0 ? (
                        <View style={styles.emptyState}>
                            <ThemedText style={[styles.emptyText, { color: theme.muted }]}>
                                No sales recorded yet.
                            </ThemedText>
                        </View>
                    ) : (
                        byMethod.map((row, index) => (
                            <View
                                key={row.method}
                                style={[
                                    styles.row,
                                    index > 0 && [styles.rowDivider, { borderTopColor: theme.border }],
                                ]}>
                                <View>
                                    <ThemedText style={styles.methodName}>{row.method}</ThemedText>
                                    <ThemedText style={[styles.methodMeta, { color: theme.muted }]}>
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
    );
}

const styles = StyleSheet.create({
    container: { gap: 12 },
    breakdownToggle: {
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 10,
        alignItems: 'center',
    },
    breakdownToggleText: { fontSize: 13 },
    card: {
        borderWidth: 1,
        borderRadius: 16,
        overflow: 'hidden',
    },
    emptyState: {
        padding: 16,
        alignItems: 'center',
    },
    emptyText: { fontSize: 13 },
    row: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    rowDivider: { borderTopWidth: 1 },
    methodName: { fontSize: 15 },
    methodMeta: { fontSize: 12 },
    breakdownValues: { alignItems: 'flex-end' },
    breakdownValue: { fontSize: 14 },
    breakdownMeta: { fontSize: 11 },
});
