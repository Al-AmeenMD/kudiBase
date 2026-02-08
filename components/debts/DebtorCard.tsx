import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import type { Debt, PaymentRecord } from './types';
import { formatDueDate } from './utils';

type Props = {
    debt: Debt;
    expanded: boolean;
    paymentHistory: PaymentRecord[];
    markingPaid: boolean;
    formatCurrency: (value: number) => string;
    onRemind: () => void;
    onMarkPaid: () => void;
    onToggleHistory: () => void;
    showDivider: boolean;
};

export function DebtorCard({
    debt,
    expanded,
    paymentHistory,
    markingPaid,
    formatCurrency,
    onRemind,
    onMarkPaid,
    onToggleHistory,
    showDivider,
}: Props) {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const router = useRouter();

    return (
        <View style={[styles.row, showDivider && [styles.rowDivider, { borderTopColor: theme.border }]]}>
            <View style={styles.rowTop}>
                <View style={styles.rowBody}>
                    <ThemedText style={styles.debtorName}>
                        {debt.customerName ?? `Sale #${debt.saleNumber}`}
                    </ThemedText>
                    <ThemedText style={styles.debtorMeta}>Due {formatDueDate(debt.dueDate)}</ThemedText>
                </View>
                <View style={styles.rowActions}>
                    <ThemedText style={styles.debtorAmount}>{formatCurrency(debt.balanceDue)}</ThemedText>
                    <View style={styles.actionRow}>
                        <Pressable onPress={onRemind} style={[styles.remindButton, { backgroundColor: theme.primary }]}>
                            <ThemedText style={styles.remindText}>Remind</ThemedText>
                        </Pressable>
                        <Pressable
                            onPress={onMarkPaid}
                            disabled={markingPaid}
                            style={[styles.payButton, { borderColor: theme.border, backgroundColor: theme.surface }]}>
                            <ThemedText style={[styles.payText, { color: theme.text }]}>
                                {markingPaid ? 'Saving...' : 'Mark paid'}
                            </ThemedText>
                        </Pressable>
                        <Pressable
                            onPress={() => router.push({ pathname: '/record-payment', params: { saleId: debt.id } })}
                            style={[styles.payButton, { borderColor: theme.border, backgroundColor: theme.surface }]}>
                            <ThemedText style={[styles.payText, { color: theme.text }]}>Record</ThemedText>
                        </Pressable>
                    </View>
                    <Pressable onPress={onToggleHistory}>
                        <ThemedText style={styles.historyLink}>
                            {expanded ? 'Hide payments' : 'View payments'}
                        </ThemedText>
                    </Pressable>
                </View>
            </View>

            {expanded && (
                <View style={[styles.historyBlock, { borderColor: theme.border, backgroundColor: theme.surface }]}>
                    {paymentHistory.length > 0 ? (
                        paymentHistory.map((payment) => (
                            <View key={payment.id} style={styles.historyRow}>
                                <ThemedText style={styles.historyText}>
                                    {formatCurrency(payment.amount)} • {payment.method}
                                </ThemedText>
                                <ThemedText style={styles.historyMeta}>
                                    {new Date(payment.createdAt).toLocaleDateString('en-NG', {
                                        day: '2-digit',
                                        month: 'short',
                                    })}
                                </ThemedText>
                            </View>
                        ))
                    ) : (
                        <ThemedText style={styles.historyMeta}>No payments recorded.</ThemedText>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 12,
    },
    rowTop: {
        flexDirection: 'row',
        gap: 12,
        justifyContent: 'space-between',
    },
    rowDivider: {
        borderTopWidth: 1,
    },
    rowBody: {
        flex: 1,
        gap: 4,
    },
    debtorName: {
        fontSize: 15,
    },
    debtorMeta: {
        fontSize: 12,
        opacity: 0.6,
    },
    rowActions: {
        alignItems: 'flex-end',
        gap: 6,
    },
    debtorAmount: {
        fontSize: 14,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 8,
    },
    remindButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
    },
    remindText: {
        color: '#FFFFFF',
        fontSize: 12,
    },
    payButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
    },
    payText: {
        fontSize: 12,
    },
    historyLink: {
        fontSize: 11,
        color: '#0F6A3D',
        paddingTop: 4,
    },
    historyBlock: {
        marginTop: 8,
        padding: 10,
        gap: 6,
        borderWidth: 1,
        borderRadius: 12,
        alignSelf: 'stretch',
    },
    historyRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    historyText: {
        fontSize: 12,
    },
    historyMeta: {
        fontSize: 11,
        color: '#6B7280',
    },
});
