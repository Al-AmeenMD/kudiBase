import { makeId, query, withDb } from './connection';
import { getSaleById } from './sales';

export type Payment = {
    id: string;
    amount: number;
    method: string;
    note: string | null;
    created_at: number;
};

export async function recordPayment(params: {
    saleId: string;
    amount: number;
    method: string;
    note?: string;
}): Promise<void> {
    const sale = await getSaleById(params.saleId);
    if (!sale) {
        throw new Error('Sale not found');
    }
    const amount = Math.min(params.amount, sale.balance_due);
    const createdAt = Date.now();
    await withDb(async (db) => {
        await db.withTransactionAsync(async () => {
            await db.runAsync(
                'UPDATE sales SET amount_paid = amount_paid + ?, balance_due = balance_due - ? WHERE id = ?',
                [amount, amount, params.saleId]
            );
            await db.runAsync(
                `INSERT INTO payments (id, sale_id, amount, method, note, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
                [makeId('payment'), params.saleId, amount, params.method, params.note ?? null, createdAt]
            );
        });
    });
}

export async function getPaymentsBySale(saleId: string): Promise<Payment[]> {
    return query<Payment>('SELECT * FROM payments WHERE sale_id = ? ORDER BY created_at DESC', [saleId]);
}

export async function markSalePaid(saleId: string, method: string = 'Cash'): Promise<void> {
    const sale = await getSaleById(saleId);
    if (!sale || sale.balance_due <= 0) {
        return;
    }
    await recordPayment({
        saleId,
        amount: sale.balance_due,
        method,
        note: 'Marked as paid',
    });
}
