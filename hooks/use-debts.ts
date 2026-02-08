import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { getOutstandingSales, initDb } from '@/lib/db';

export type Debt = {
    id: string;
    saleNumber: number;
    customerName: string | null;
    customerPhone: string | null;
    balanceDue: number;
    dueDate: string | null;
    createdAt: number;
};

type UseDebtsResult = {
    debts: Debt[];
    totalDue: number;
    dueToday: number;
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
};

export function useDebts(): UseDebtsResult {
    const [debts, setDebts] = useState<Debt[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const refresh = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            await initDb();
            const rows = await getOutstandingSales();
            setDebts(
                rows.map((row) => ({
                    id: row.id,
                    saleNumber: row.sale_number,
                    customerName: row.customer_name,
                    customerPhone: row.customer_phone,
                    balanceDue: row.balance_due,
                    dueDate: row.due_date,
                    createdAt: row.created_at,
                }))
            );
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to load debts'));
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

    const totalDue = useMemo(() => {
        return debts.reduce((sum, debt) => sum + debt.balanceDue, 0);
    }, [debts]);

    const dueToday = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return debts.reduce((sum, debt) => {
            if (!debt.dueDate) return sum;
            const due = new Date(debt.dueDate);
            due.setHours(0, 0, 0, 0);
            return due.getTime() === today.getTime() ? sum + debt.balanceDue : sum;
        }, 0);
    }, [debts]);

    return { debts, totalDue, dueToday, loading, error, refresh };
}
