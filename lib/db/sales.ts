import { makeId, query, withDb } from './connection';
import { emitDbEvent } from '@/lib/db/events';

// Types
export type Sale = {
    id: string;
    sale_number: number;
    payment_method: string;
    subtotal: number;
    amount_paid: number;
    balance_due: number;
    customer_name: string | null;
    customer_phone: string | null;
    due_date: string | null;
    created_at: number;
};

export type SaleItem = {
    id: string;
    name_snapshot: string;
    unit_price: number;
    cost_snapshot: number;
    quantity: number;
    line_total: number;
};

// Sales CRUD
export async function recordSale(params: {
    items: Array<{ id: string; name: string; price: number; qty: number; cost?: number }>;
    paymentMethod: string;
    subtotal: number;
    amountPaid: number;
    balanceDue: number;
    customerName?: string;
    customerPhone?: string;
    dueDate?: string;
}): Promise<{ saleId: string; saleNumber: number }> {
    const next = await query<{ next: number }>(
        'SELECT COALESCE(MAX(sale_number), 0) + 1 as next FROM sales'
    );
    const saleNumber = next[0]?.next ?? 1;
    const saleId = makeId('sale');
    const createdAt = Date.now();

    await withDb(async (db) => {
        await db.withTransactionAsync(async () => {
            await db.runAsync(
                `INSERT INTO sales (
          id, sale_number, payment_method, subtotal, amount_paid, balance_due,
          customer_name, customer_phone, due_date, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    saleId,
                    saleNumber,
                    params.paymentMethod,
                    params.subtotal,
                    params.amountPaid,
                    params.balanceDue,
                    params.customerName ?? null,
                    params.customerPhone ?? null,
                    params.dueDate ?? null,
                    createdAt,
                ]
            );

            for (const item of params.items) {
                const lineTotal = item.price * item.qty;
                const costSnapshot = item.cost ?? 0;
                await db.runAsync(
                    `INSERT INTO sale_items (
            id, sale_id, item_id, name_snapshot, unit_price, cost_snapshot, quantity, line_total
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [makeId('sale_item'), saleId, item.id, item.name, item.price, costSnapshot, item.qty, lineTotal]
                );
                await db.runAsync('UPDATE items SET stock_qty = stock_qty - ? WHERE id = ?', [
                    item.qty,
                    item.id,
                ]);
                await db.runAsync(
                    `INSERT INTO stock_movements (
            id, item_id, type, quantity, reason, ref_id, created_at, note
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [makeId('stock'), item.id, 'out', item.qty, 'sale', saleId, createdAt, null]
                );
            }
        });
    });
    emitDbEvent('sales');
    return { saleId, saleNumber };
}

export async function getSaleById(saleId: string): Promise<Sale | null> {
    const rows = await query<Sale>('SELECT * FROM sales WHERE id = ? LIMIT 1', [saleId]);
    return rows[0] ?? null;
}

export async function getSaleItems(saleId: string): Promise<SaleItem[]> {
    return query<SaleItem>('SELECT * FROM sale_items WHERE sale_id = ? ORDER BY id ASC', [saleId]);
}

export async function getSalesList(limit: number = 50) {
    return query<{
        id: string;
        sale_number: number;
        payment_method: string;
        subtotal: number;
        amount_paid: number;
        balance_due: number;
        created_at: number;
    }>('SELECT * FROM sales ORDER BY created_at DESC LIMIT ?', [limit]);
}

export async function getOutstandingSales() {
    return query<Sale>('SELECT * FROM sales WHERE balance_due > 0 ORDER BY created_at DESC');
}

// Sales Reports
export async function getSalesSummary(startMs: number, endMs: number) {
    const totals = await query<{
        total_sales: number | null;
        total_paid: number | null;
        total_due: number | null;
        sale_count: number | null;
    }>(
        `SELECT
      COALESCE(SUM(subtotal), 0) as total_sales,
      COALESCE(SUM(amount_paid), 0) as total_paid,
      COALESCE(SUM(balance_due), 0) as total_due,
      COUNT(*) as sale_count
     FROM sales
     WHERE created_at BETWEEN ? AND ?`,
        [startMs, endMs]
    );

    const byMethod = await query<{
        payment_method: string;
        total_sales: number | null;
        total_paid: number | null;
        total_due: number | null;
        sale_count: number | null;
    }>(
        `SELECT
      payment_method,
      COALESCE(SUM(subtotal), 0) as total_sales,
      COALESCE(SUM(amount_paid), 0) as total_paid,
      COALESCE(SUM(balance_due), 0) as total_due,
      COUNT(*) as sale_count
     FROM sales
     WHERE created_at BETWEEN ? AND ?
     GROUP BY payment_method`,
        [startMs, endMs]
    );

    return {
        totals: totals[0] ?? { total_sales: 0, total_paid: 0, total_due: 0, sale_count: 0 },
        byMethod,
    };
}

export async function getDailySalesTotals(startMs: number, endMs: number) {
    return query<{
        day: string;
        total_sales: number | null;
        sale_count: number | null;
    }>(
        `SELECT
      strftime('%Y-%m-%d', created_at / 1000, 'unixepoch') as day,
      COALESCE(SUM(subtotal), 0) as total_sales,
      COUNT(*) as sale_count
     FROM sales
     WHERE created_at BETWEEN ? AND ?
     GROUP BY day
     ORDER BY day ASC`,
        [startMs, endMs]
    );
}

export async function getTopSellingItems(startMs: number, endMs: number, limit: number = 5) {
    return query<{
        name: string;
        total_qty: number | null;
        total_sales: number | null;
    }>(
        `SELECT
      sale_items.name_snapshot as name,
      COALESCE(SUM(sale_items.quantity), 0) as total_qty,
      COALESCE(SUM(sale_items.line_total), 0) as total_sales
     FROM sale_items
     JOIN sales ON sales.id = sale_items.sale_id
     WHERE sales.created_at BETWEEN ? AND ?
     GROUP BY sale_items.name_snapshot
     ORDER BY total_qty DESC
     LIMIT ?`,
        [startMs, endMs, limit]
    );
}

export async function getProfitSummary(startMs: number, endMs: number) {
    const rows = await query<{
        profit: number | null;
        revenue: number | null;
    }>(
        `SELECT
      COALESCE(SUM(sale_items.line_total - (sale_items.cost_snapshot * sale_items.quantity)), 0) as profit,
      COALESCE(SUM(sale_items.line_total), 0) as revenue
     FROM sale_items
     JOIN sales ON sales.id = sale_items.sale_id
     WHERE sales.created_at BETWEEN ? AND ?`,
        [startMs, endMs]
    );
    return rows[0] ?? { profit: 0, revenue: 0 };
}

export async function getDailyProfitTotals(startMs: number, endMs: number) {
    return query<{
        day: string;
        profit: number | null;
        revenue: number | null;
    }>(
        `SELECT
      strftime('%Y-%m-%d', sales.created_at / 1000, 'unixepoch') as day,
      COALESCE(SUM(sale_items.line_total - (sale_items.cost_snapshot * sale_items.quantity)), 0) as profit,
      COALESCE(SUM(sale_items.line_total), 0) as revenue
     FROM sale_items
     JOIN sales ON sales.id = sale_items.sale_id
     WHERE sales.created_at BETWEEN ? AND ?
     GROUP BY day
     ORDER BY day ASC`,
        [startMs, endMs]
    );
}

export async function getTopProfitItems(startMs: number, endMs: number, limit: number = 5) {
    return query<{
        name: string;
        profit: number | null;
        total_qty: number | null;
    }>(
        `SELECT
      sale_items.name_snapshot as name,
      COALESCE(SUM(sale_items.line_total - (sale_items.cost_snapshot * sale_items.quantity)), 0) as profit,
      COALESCE(SUM(sale_items.quantity), 0) as total_qty
     FROM sale_items
     JOIN sales ON sales.id = sale_items.sale_id
     WHERE sales.created_at BETWEEN ? AND ?
     GROUP BY sale_items.name_snapshot
     ORDER BY profit DESC
     LIMIT ?`,
        [startMs, endMs, limit]
    );
}

export async function getTopRepeatCustomers(startMs: number, endMs: number, limit: number = 5) {
    return query<{
        customer_name: string;
        sale_count: number | null;
        total_sales: number | null;
        last_purchase: number | null;
    }>(
        `SELECT
      customer_name,
      COUNT(*) as sale_count,
      COALESCE(SUM(subtotal), 0) as total_sales,
      MAX(created_at) as last_purchase
     FROM sales
     WHERE created_at BETWEEN ? AND ?
       AND customer_name IS NOT NULL
       AND TRIM(customer_name) <> ''
     GROUP BY customer_name
     HAVING sale_count > 1
     ORDER BY sale_count DESC, total_sales DESC
     LIMIT ?`,
        [startMs, endMs, limit]
    );
}

export async function getRecentSalesTotals(days: number) {
    const end = Date.now();
    const start = end - days * 24 * 60 * 60 * 1000;
    const rows = await query<{
        revenue: number | null;
        paid: number | null;
        due: number | null;
        sale_count: number | null;
    }>(
        `SELECT
      COALESCE(SUM(subtotal), 0) as revenue,
      COALESCE(SUM(amount_paid), 0) as paid,
      COALESCE(SUM(balance_due), 0) as due,
      COUNT(*) as sale_count
     FROM sales
     WHERE created_at BETWEEN ? AND ?`,
        [start, end]
    );
    return rows[0] ?? { revenue: 0, paid: 0, due: 0, sale_count: 0 };
}

export async function getRecentCustomers(limit: number = 8) {
    return query<{
        customer_name: string | null;
        customer_phone: string | null;
        last_seen: number | null;
    }>(
        `SELECT
      customer_name,
      customer_phone,
      MAX(created_at) as last_seen
     FROM sales
     WHERE (customer_name IS NOT NULL AND TRIM(customer_name) <> '')
        OR (customer_phone IS NOT NULL AND TRIM(customer_phone) <> '')
     GROUP BY customer_name, customer_phone
     ORDER BY last_seen DESC
     LIMIT ?`,
        [limit]
    );
}

export async function getTopCustomers(startMs: number, endMs: number, limit: number = 5) {
    return query<{
        customer_name: string;
        total_sales: number | null;
        sale_count: number | null;
    }>(
        `SELECT
      customer_name,
      COALESCE(SUM(subtotal), 0) as total_sales,
      COUNT(*) as sale_count
     FROM sales
     WHERE created_at BETWEEN ? AND ?
       AND customer_name IS NOT NULL
       AND TRIM(customer_name) <> ''
     GROUP BY customer_name
     ORDER BY total_sales DESC
     LIMIT ?`,
        [startMs, endMs, limit]
    );
}

export async function getPayLaterSettlementDurations(startMs: number, endMs: number) {
    return query<{
        created_at: number;
        last_payment: number;
    }>(
        `SELECT
      sales.created_at as created_at,
      MAX(payments.created_at) as last_payment
     FROM sales
     JOIN payments ON payments.sale_id = sales.id
     WHERE sales.payment_method = 'Pay Later'
       AND sales.balance_due = 0
       AND sales.created_at BETWEEN ? AND ?
     GROUP BY sales.id`,
        [startMs, endMs]
    );
}
