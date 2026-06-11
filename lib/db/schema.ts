import { execute, getActiveDbName, query } from './connection';

const initPromises = new Map<string, Promise<void>>();

export async function initDb(): Promise<void> {
    const dbName = getActiveDbName();
    const initPromise = initPromises.get(dbName);
    if (initPromise) return initPromise;
    const nextPromise = doInitDb().catch((error) => {
        // Reset so a retry is possible after a failure
        initPromises.delete(dbName);
        throw error;
    });
    initPromises.set(dbName, nextPromise);
    return nextPromise;
}

async function doInitDb(): Promise<void> {
    await execute('PRAGMA foreign_keys = ON;');

    // Create tables
    await execute(
        `CREATE TABLE IF NOT EXISTS business_profile (
      id INTEGER PRIMARY KEY NOT NULL,
      business_name TEXT NOT NULL,
      owner_name TEXT,
      phone TEXT,
      address TEXT,
      email TEXT,
      bank_name TEXT,
      account_number TEXT,
      logo_path TEXT,
      reminder_template TEXT
    );`
    );

    await execute(
        `CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT
    );`
    );

    await execute(
        `CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      cost_price INTEGER NOT NULL,
      stock_qty INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );`
    );

    await execute(
        `CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY NOT NULL,
      sale_number INTEGER NOT NULL,
      payment_method TEXT NOT NULL,
      subtotal INTEGER NOT NULL,
      amount_paid INTEGER NOT NULL,
      balance_due INTEGER NOT NULL,
      customer_name TEXT,
      customer_phone TEXT,
      due_date TEXT,
      created_at INTEGER NOT NULL
    );`
    );

    await execute(
        `CREATE TABLE IF NOT EXISTS sale_items (
      id TEXT PRIMARY KEY NOT NULL,
      sale_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      name_snapshot TEXT NOT NULL,
      unit_price INTEGER NOT NULL,
      cost_snapshot INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      line_total INTEGER NOT NULL
    );`
    );

    await execute(
        `CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY NOT NULL,
      item_id TEXT NOT NULL,
      type TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      reason TEXT NOT NULL,
      ref_id TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );`
    );

    await execute(
        `CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY NOT NULL,
      sale_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      method TEXT NOT NULL,
      note TEXT,
      created_at INTEGER NOT NULL
    );`
    );

    // Migrations
    const stockColumns = await query<{ name: string }>('PRAGMA table_info(stock_movements)');
    const hasNote = stockColumns.some((column) => column.name === 'note');
    if (!hasNote) {
        try {
            await execute('ALTER TABLE stock_movements ADD COLUMN note TEXT');
        } catch (error) {
            if (!(error instanceof Error && error.message.includes('duplicate column name: note'))) {
                throw error;
            }
        }
    }

    const businessColumns = await query<{ name: string }>('PRAGMA table_info(business_profile)');
    const hasTemplate = businessColumns.some((column) => column.name === 'reminder_template');
    if (!hasTemplate) {
        await execute('ALTER TABLE business_profile ADD COLUMN reminder_template TEXT');
    }
    const hasEmail = businessColumns.some((column) => column.name === 'email');
    if (!hasEmail) {
        await execute('ALTER TABLE business_profile ADD COLUMN email TEXT');
    }

    const itemColumns = await query<{ name: string }>('PRAGMA table_info(items)');
    const hasCostPrice = itemColumns.some((column) => column.name === 'cost_price');
    if (!hasCostPrice) {
        await execute('ALTER TABLE items ADD COLUMN cost_price INTEGER NOT NULL DEFAULT 0');
    }

    const saleItemColumns = await query<{ name: string }>('PRAGMA table_info(sale_items)');
    const hasCostSnapshot = saleItemColumns.some((column) => column.name === 'cost_snapshot');
    if (!hasCostSnapshot) {
        await execute('ALTER TABLE sale_items ADD COLUMN cost_snapshot INTEGER NOT NULL DEFAULT 0');
    }

    // Create indexes for performance
    await execute('CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);');
    await execute('CREATE INDEX IF NOT EXISTS idx_sales_balance_due ON sales(balance_due);');
    await execute('CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);');
    await execute('CREATE INDEX IF NOT EXISTS idx_sale_items_item_id ON sale_items(item_id);');
    await execute('CREATE INDEX IF NOT EXISTS idx_stock_movements_item_id ON stock_movements(item_id);');
    await execute('CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at);');
    await execute('CREATE INDEX IF NOT EXISTS idx_payments_sale_id ON payments(sale_id);');
    await execute('CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);');

    // Seed sample items removed for production.
}
