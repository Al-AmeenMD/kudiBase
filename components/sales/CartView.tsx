import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrency } from '@/hooks/use-currency';
import { CartItem } from './types';

type Props = {
    cart: CartItem[];
    qtyInputs: Record<string, string>;
    subtotal: number;
    onUpdateQty: (itemId: string, delta: number) => void;
    onQtyInputChange: (itemId: string, value: string) => void;
    onQtyInputBlur: (itemId: string) => void;
    onLayout?: (event: { nativeEvent: { layout: { y: number; height: number } } }) => void;
};

export function CartView({
    cart,
    qtyInputs,
    subtotal,
    onUpdateQty,
    onQtyInputChange,
    onQtyInputBlur,
    onLayout,
}: Props) {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { format } = useCurrency();

    return (
        <View style={styles.container} onLayout={onLayout}>
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
                            <View style={{ flex: 1, paddingRight: 10 }}>
                                <ThemedText style={styles.cartItemName} numberOfLines={2} ellipsizeMode="tail">
                                    {item.name}
                                </ThemedText>
                                <ThemedText style={[styles.cartMeta, { color: theme.muted }]}>
                                    {format(item.price)} each
                                </ThemedText>
                            </View>
                            <View style={[styles.qtyControl, { flexShrink: 0 }]}>
                                <Pressable
                                    onPress={() => onUpdateQty(item.id, -1)}
                                    style={[styles.qtyButton, { borderColor: theme.border }]}>
                                    <ThemedText style={styles.qtyText}>-</ThemedText>
                                </Pressable>
                                <TextInput
                                    value={qtyInputs[item.id] ?? String(item.qty)}
                                    onChangeText={(value) => onQtyInputChange(item.id, value)}
                                    onBlur={() => onQtyInputBlur(item.id)}
                                    keyboardType="number-pad"
                                    style={[
                                        styles.qtyInput,
                                        { borderColor: theme.border, color: theme.text },
                                    ]}
                                />
                                <Pressable
                                    onPress={() => onUpdateQty(item.id, 1)}
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
    );
}

const styles = StyleSheet.create({
    container: { gap: 12 },
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
    qtyButtonDisabled: { opacity: 0.4 },
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
});
