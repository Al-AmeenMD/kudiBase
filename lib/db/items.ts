import { execute, makeId, query } from './connection';

export type Item = {
    id: string;
    name: string;
    price: number;
    cost_price: number;
    stock_qty: number;
};

export async function getItems(): Promise<Item[]> {
    return query<Item>('SELECT * FROM items ORDER BY name ASC');
}

export async function getItemById(itemId: string): Promise<Item | null> {
    const rows = await query<Item>('SELECT * FROM items WHERE id = ? LIMIT 1', [itemId]);
    return rows[0] ?? null;
}

export async function createItem(params: {
    name: string;
    price: number;
    stockQty: number;
    costPrice?: number;
}): Promise<void> {
    const now = Date.now();
    await execute(
        'INSERT INTO items (id, name, price, cost_price, stock_qty, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [makeId('item'), params.name, params.price, params.costPrice ?? 0, params.stockQty, now]
    );
}

export async function updateItem(params: {
    id: string;
    name: string;
    price: number;
    stockQty: number;
    costPrice?: number;
}): Promise<void> {
    await execute('UPDATE items SET name = ?, price = ?, cost_price = ?, stock_qty = ? WHERE id = ?', [
        params.name,
        params.price,
        params.costPrice ?? 0,
        params.stockQty,
        params.id,
    ]);
}

export async function getDeadStockItems(cutoffMs: number, limit: number = 8) {
    return query<{
        id: string;
        name: string;
        stock_qty: number;
        last_sold_at: number | null;
    }>(
        `SELECT
      items.id as id,
      items.name as name,
      items.stock_qty as stock_qty,
      MAX(sales.created_at) as last_sold_at
     FROM items
     LEFT JOIN sale_items ON sale_items.item_id = items.id
     LEFT JOIN sales ON sales.id = sale_items.sale_id
     GROUP BY items.id
     HAVING last_sold_at IS NULL OR last_sold_at < ?
     ORDER BY last_sold_at ASC
     LIMIT ?`,
        [cutoffMs, limit]
    );
}

export async function adjustStock(params: {
    itemId: string;
    delta: number;
    reason: string;
    note?: string;
}): Promise<void> {
    const item = await getItemById(params.itemId);
    if (!item) {
        throw new Error('Item not found');
    }
    const newQty = item.stock_qty + params.delta;
    if (newQty < 0) {
        throw new Error('Insufficient stock');
    }
    await execute('UPDATE items SET stock_qty = ? WHERE id = ?', [newQty, params.itemId]);

    const now = Date.now();
    await execute(
        `INSERT INTO stock_movements (id, item_id, type, quantity, reason, ref_id, created_at, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            makeId('mov'),
            params.itemId,
            params.delta >= 0 ? 'IN' : 'OUT',
            Math.abs(params.delta),
            params.reason,
            'manual',
            now,
            params.note ?? null,
        ]
    );
}
