import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { PaymentMethod } from './types';

const paymentMethods: PaymentMethod[] = ['Cash', 'Transfer', 'POS', 'Pay Later'];

type Props = {
    selected: PaymentMethod;
    onSelect: (method: PaymentMethod) => void;
};

export function PaymentMethodPicker({ selected, onSelect }: Props) {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    return (
        <View style={styles.container}>
            <ThemedText type="subtitle">Payment</ThemedText>
            <View style={styles.paymentRow}>
                {paymentMethods.map((method) => (
                    <Pressable
                        key={method}
                        onPress={() => onSelect(method)}
                        style={[
                            styles.paymentChip,
                            {
                                backgroundColor: selected === method ? theme.primary : theme.surface,
                                borderColor: theme.border,
                            },
                        ]}>
                        <ThemedText
                            style={[
                                styles.paymentText,
                                { color: selected === method ? '#FFFFFF' : theme.text },
                            ]}>
                            {method}
                        </ThemedText>
                    </Pressable>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { gap: 12 },
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
});
