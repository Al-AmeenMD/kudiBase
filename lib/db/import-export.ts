import { query, withDb } from './connection';
import { initDb } from './schema';

export type ExportPayload = {
    schema_version: number;
    exported_at: number;
    tables: {
        items: unknown[];
        sales: unknown[];
        sale_items: unknown[];
        stock_movements: unknown[];
        payments: unknown[];
        business_profile: unknown[];
        app_settings: unknown[];
    };
};

export async function exportData(): Promise<ExportPayload> {
    await initDb();
    const [
        items,
        sales,
        saleItems,
        stockMovements,
        payments,
        businessProfile,
        appSettings,
    ] = await Promise.all([
        query('SELECT * FROM items'),
        query('SELECT * FROM sales'),
        query('SELECT * FROM sale_items'),
        query('SELECT * FROM stock_movements'),
        query('SELECT * FROM payments'),
        query('SELECT * FROM business_profile'),
        query('SELECT * FROM app_settings'),
    ]);

    return {
        schema_version: 1,
        exported_at: Date.now(),
        tables: {
            items,
            sales,
            sale_items: saleItems,
            stock_movements: stockMovements,
            payments,
            business_profile: businessProfile,
            app_settings: appSettings,
        },
    };
}

export async function importData(payload: {
    schema_version: number;
    tables: Record<string, Array<Record<string, unknown>>>;
}): Promise<void> {
    if (!payload?.tables) {
        throw new Error('Invalid backup file.');
    }
    await withDb(async (db) => {
        await db.withTransactionAsync(async () => {
            await db.runAsync('DELETE FROM payments;');
            await db.runAsync('DELETE FROM sale_items;');
            await db.runAsync('DELETE FROM stock_movements;');
            await db.runAsync('DELETE FROM sales;');
            await db.runAsync('DELETE FROM items;');
            await db.runAsync('DELETE FROM business_profile;');
            await db.runAsync('DELETE FROM app_settings;');

            const tables = payload.tables;
            for (const row of tables.items ?? []) {
                await db.runAsync(
                    'INSERT INTO items (id, name, price, cost_price, stock_qty, created_at) VALUES (?, ?, ?, ?, ?, ?)',
                    [
                        row.id as string,
                        row.name as string,
                        row.price as number,
                        (row.cost_price as number) ?? 0,
                        row.stock_qty as number,
                        row.created_at as number,
                    ]
                );
            }
            for (const row of tables.sales ?? []) {
                await db.runAsync(
                    `INSERT INTO sales (
            id, sale_number, payment_method, subtotal, amount_paid, balance_due,
            customer_name, customer_phone, due_date, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        row.id as string,
                        row.sale_number as number,
                        row.payment_method as string,
                        row.subtotal as number,
                        row.amount_paid as number,
                        row.balance_due as number,
                        (row.customer_name as string) ?? null,
                        (row.customer_phone as string) ?? null,
                        (row.due_date as string) ?? null,
                        row.created_at as number,
                    ]
                );
            }
            for (const row of tables.sale_items ?? []) {
                await db.runAsync(
                    `INSERT INTO sale_items (
            id, sale_id, item_id, name_snapshot, unit_price, cost_snapshot, quantity, line_total
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        row.id as string,
                        row.sale_id as string,
                        row.item_id as string,
                        row.name_snapshot as string,
                        row.unit_price as number,
                        (row.cost_snapshot as number) ?? 0,
                        row.quantity as number,
                        row.line_total as number,
                    ]
                );
            }
            for (const row of tables.stock_movements ?? []) {
                await db.runAsync(
                    `INSERT INTO stock_movements (
            id, item_id, type, quantity, reason, ref_id, created_at, note
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        row.id as string,
                        row.item_id as string,
                        row.type as string,
                        row.quantity as number,
                        row.reason as string,
                        row.ref_id as string,
                        row.created_at as number,
                        (row.note as string) ?? null,
                    ]
                );
            }
            for (const row of tables.payments ?? []) {
                await db.runAsync(
                    `INSERT INTO payments (id, sale_id, amount, method, note, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        row.id as string,
                        row.sale_id as string,
                        row.amount as number,
                        row.method as string,
                        (row.note as string) ?? null,
                        row.created_at as number,
                    ]
                );
            }
            for (const row of tables.business_profile ?? []) {
                await db.runAsync(
                    `INSERT INTO business_profile (
            id, business_name, owner_name, phone, address, email,
            bank_name, account_number, logo_path, reminder_template
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        (row.id as number) ?? 1,
                        row.business_name as string,
                        (row.owner_name as string) ?? null,
                        (row.phone as string) ?? null,
                        (row.address as string) ?? null,
                        (row.email as string) ?? null,
                        (row.bank_name as string) ?? null,
                        (row.account_number as string) ?? null,
                        (row.logo_path as string) ?? null,
                        (row.reminder_template as string) ?? null,
                    ]
                );
            }
            for (const row of tables.app_settings ?? []) {
                await db.runAsync('INSERT INTO app_settings (key, value) VALUES (?, ?)', [
                    row.key as string,
                    (row.value as string) ?? null,
                ]);
            }
        });
    });
}

export async function clearAllData(): Promise<void> {
    await initDb();
    await withDb(async (db) => {
        await db.withTransactionAsync(async () => {
            await db.runAsync('DELETE FROM payments;');
            await db.runAsync('DELETE FROM sale_items;');
            await db.runAsync('DELETE FROM stock_movements;');
            await db.runAsync('DELETE FROM sales;');
            await db.runAsync('DELETE FROM items;');
            await db.runAsync('DELETE FROM business_profile;');
            await db.runAsync('DELETE FROM app_settings;');
        });
    });
}
