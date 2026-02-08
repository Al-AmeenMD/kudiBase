import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrency } from '@/hooks/use-currency';
import { Item } from './types';

type Props = {
    items: Item[];
    cartQuantities: Record<string, number>;
    searchQuery: string;
    showAll: boolean;
    onSearchChange: (query: string) => void;
    onShowAllToggle: () => void;
    onAddToCart: (item: Item) => void;
};

export function QuickAddGrid({
    items,
    cartQuantities,
    searchQuery,
    showAll,
    onSearchChange,
    onShowAllToggle,
    onAddToCart,
}: Props) {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { format } = useCurrency();

    const term = searchQuery.trim().toLowerCase();
    const filtered = term
        ? items.filter((item) => item.name.toLowerCase().includes(term))
        : items;
    const quickAddItems = term || showAll ? filtered : filtered.slice(0, 10);

    return (
        <View style={styles.container}>
            <View style={styles.sectionHeader}>
                <ThemedText type="subtitle">Quick add items</ThemedText>
                {items.length > 10 && !searchQuery.trim() ? (
                    <Pressable onPress={onShowAllToggle}>
                        <ThemedText style={styles.viewAllText}>
                            {showAll ? 'Show less' : 'View all'}
                        </ThemedText>
                    </Pressable>
                ) : null}
            </View>
            <TextInput
                value={searchQuery}
                onChangeText={onSearchChange}
                placeholder="Search inventory"
                placeholderTextColor={theme.muted}
                style={[
                    styles.searchInput,
                    { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text },
                ]}
            />
            <View style={styles.itemGrid}>
                {quickAddItems.map((item) => {
                    const qtyInCart = cartQuantities[item.id] ?? 0;
                    const isAtLimit = qtyInCart >= item.stock;
                    const isOutOfStock = item.stock === 0 || isAtLimit;
                    const statusLabel = isOutOfStock ? 'Out of stock' : '';

                    return (
                        <Pressable
                            key={item.id}
                            onPress={() => onAddToCart(item)}
                            disabled={isOutOfStock || isAtLimit}
                            style={[
                                styles.itemCard,
                                { backgroundColor: theme.surface, borderColor: theme.border },
                                (isOutOfStock || isAtLimit) && styles.itemCardDisabled,
                            ]}>
                            <ThemedText style={styles.itemName}>{item.name}</ThemedText>
                            <ThemedText style={[styles.itemMeta, { color: theme.muted }]}>
                                {format(item.price)} • {item.stock} in stock
                            </ThemedText>
                            {statusLabel ? (
                                <View style={[styles.statusPill, { backgroundColor: theme.secondary }]}>
                                    <ThemedText style={[styles.statusText, { color: theme.onSecondary }]}>
                                        {statusLabel}
                                    </ThemedText>
                                </View>
                            ) : (
                                <View style={[styles.itemButton, { backgroundColor: theme.primary }]}>
                                    <ThemedText style={styles.itemButtonText}>Add</ThemedText>
                                </View>
                            )}
                        </Pressable>
                    );
                })}
                {quickAddItems.length === 0 ? (
                    <View style={styles.emptyState}>
                        <ThemedText style={[styles.emptyText, { color: theme.muted }]}>
                            No matching items.
                        </ThemedText>
                    </View>
                ) : null}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { gap: 12 },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    viewAllText: {
        fontSize: 12,
        color: '#0F6A3D',
    },
    searchInput: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 14,
        fontFamily: 'Sora-Regular',
    },
    itemGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    itemCard: {
        width: '48%',
        borderRadius: 16,
        borderWidth: 1,
        padding: 14,
        gap: 8,
    },
    itemCardDisabled: {
        opacity: 0.5,
    },
    itemName: { fontSize: 15 },
    itemMeta: { fontSize: 12 },
    itemButton: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
    },
    itemButtonText: { color: '#FFFFFF', fontSize: 12 },
    statusPill: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
    },
    statusText: { fontSize: 11 },
    emptyState: {
        padding: 16,
        alignItems: 'center',
    },
    emptyText: { fontSize: 13 },
});
