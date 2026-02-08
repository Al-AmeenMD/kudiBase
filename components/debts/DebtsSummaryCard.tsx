import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Props = {
    totalDue: number;
    dueToday: number;
    formatCurrency: (value: number) => string;
};

export function DebtsSummaryCard({ totalDue, dueToday, formatCurrency }: Props) {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    return (
        <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
                <ThemedText style={styles.summaryLabel}>Total owed</ThemedText>
                <ThemedText style={styles.summaryValue}>{formatCurrency(totalDue)}</ThemedText>
            </View>
            <View style={[styles.summaryCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
                <ThemedText style={styles.summaryLabel}>Due today</ThemedText>
                <ThemedText style={styles.summaryValue}>{formatCurrency(dueToday)}</ThemedText>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    summaryRow: {
        flexDirection: 'row',
        gap: 12,
    },
    summaryCard: {
        flex: 1,
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        gap: 6,
    },
    summaryLabel: {
        fontSize: 12,
        opacity: 0.6,
    },
    summaryValue: {
        fontSize: 18,
    },
});
