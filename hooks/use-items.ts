import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { getItems, initDb } from '@/lib/db';

export type Item = {
    id: string;
    name: string;
    price: number;
    costPrice: number;
    stockQty: number;
};

type UseItemsResult = {
    items: Item[];
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
};

export function useItems(): UseItemsResult {
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const refresh = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            await initDb();
            const rows = await getItems();
            setItems(
                rows.map((row) => ({
                    id: row.id,
                    name: row.name,
                    price: row.price,
                    costPrice: row.cost_price,
                    stockQty: row.stock_qty,
                }))
            );
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to load items'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    useFocusEffect(
        useCallback(() => {
            refresh();
        }, [refresh])
    );

    return { items, loading, error, refresh };
}
