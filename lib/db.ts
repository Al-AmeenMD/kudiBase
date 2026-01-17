import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

import { emitSettingChange } from '@/lib/settings-events';

type SqlParams = (string | number | null)[];

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb() {
  if (Platform.OS === 'web') {
    throw new Error('SQLite is not supported on web. Use a device or emulator.');
  }
  if (!SQLite.openDatabaseAsync) {
    throw new Error(
      'expo-sqlite native module not loaded. Restart Metro with -c and ensure expo-sqlite is installed.'
    );
  }
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('kudibase.db');
  }
  return dbPromise;
}

async function withDb<T>(task: (db: SQLite.SQLiteDatabase) => Promise<T>) {
  try {
    const db = await getDb();
    return await task(db);
  } catch (error) {
    const message = String(error ?? '');
    if (message.includes('NativeDatabase') || message.includes('released')) {
      dbPromise = null;
      const db = await getDb();
      return await task(db);
    }
    throw error;
  }
}

async function execute(sql: string, params: SqlParams = []) {
  await withDb((db) => db.runAsync(sql, params));
}

async function query<T>(sql: string, params: SqlParams = []) {
  return withDb((db) => db.getAllAsync<T>(sql, params));
}

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function initDb() {
  await withDb((db) => db.execAsync('PRAGMA foreign_keys = ON;'));
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

  const stockColumns = await query<{ name: string }>('PRAGMA table_info(stock_movements)');
  const hasNote = stockColumns.some((column) => column.name === 'note');
  if (!hasNote) {
    await execute('ALTER TABLE stock_movements ADD COLUMN note TEXT');
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

  const existing = await query<{ count: number }>('SELECT COUNT(*) as count FROM items');
  if (existing[0]?.count === 0) {
    const now = Date.now();
    const seedItems = [
      { name: 'Phone Charger', price: 3000, stock: 12 },
      { name: 'USB Cable', price: 1200, stock: 18 },
      { name: 'Power Bank', price: 8500, stock: 6 },
      { name: 'SIM Card', price: 500, stock: 40 },
      { name: 'Screen Guard', price: 700, stock: 24 },
    ];
    for (const item of seedItems) {
      await execute(
        'INSERT INTO items (id, name, price, stock_qty, created_at) VALUES (?, ?, ?, ?, ?)',
        [makeId('item'), item.name, item.price, item.stock, now]
      );
    }
  }
}

export async function getBusinessProfile() {
  const rows = await query<{
    id: number;
    business_name: string;
    owner_name: string | null;
    phone: string | null;
    address: string | null;
    email: string | null;
    bank_name: string | null;
    account_number: string | null;
    logo_path: string | null;
    reminder_template: string | null;
  }>('SELECT * FROM business_profile WHERE id = 1 LIMIT 1');
  return rows[0] ?? null;
}

export async function upsertBusinessProfile(params: {
  businessName: string;
  ownerName?: string;
  phone?: string;
  address?: string;
  email?: string;
  bankName?: string;
  accountNumber?: string;
  logoPath?: string;
  reminderTemplate?: string;
}) {
  await execute(
    `INSERT INTO business_profile (
      id, business_name, owner_name, phone, address, email, bank_name, account_number, logo_path, reminder_template
    ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      business_name = excluded.business_name,
      owner_name = excluded.owner_name,
      phone = excluded.phone,
      address = excluded.address,
      email = excluded.email,
      bank_name = excluded.bank_name,
      account_number = excluded.account_number,
      logo_path = excluded.logo_path,
      reminder_template = excluded.reminder_template`,
    [
      params.businessName,
      params.ownerName ?? null,
      params.phone ?? null,
      params.address ?? null,
      params.email ?? null,
      params.bankName ?? null,
      params.accountNumber ?? null,
      params.logoPath ?? null,
      params.reminderTemplate ?? null,
    ]
  );
}

export async function getAppSetting(key: string) {
  const rows = await query<{ value: string | null }>('SELECT value FROM app_settings WHERE key = ? LIMIT 1', [key]);
  return rows[0]?.value ?? null;
}

export async function setAppSetting(key: string, value: string) {
  await execute(
    `INSERT INTO app_settings (key, value)
     VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value]
  );
  emitSettingChange(key, value);
}

export async function getAllAppSettings() {
  return query<{ key: string; value: string | null }>('SELECT key, value FROM app_settings');
}

export async function exportData() {
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
}) {
  if (!payload?.tables) {
    throw new Error('Invalid backup file.');
  }
  await withDb(async (db) => {
    await db.withTransactionAsync(async () => {
      await db.execAsync('DELETE FROM payments;');
      await db.execAsync('DELETE FROM sale_items;');
      await db.execAsync('DELETE FROM stock_movements;');
      await db.execAsync('DELETE FROM sales;');
      await db.execAsync('DELETE FROM items;');
      await db.execAsync('DELETE FROM business_profile;');
      await db.execAsync('DELETE FROM app_settings;');

      const tables = payload.tables;
      for (const row of tables.items ?? []) {
        await db.runAsync(
          'INSERT INTO items (id, name, price, stock_qty, created_at) VALUES (?, ?, ?, ?, ?)',
          [row.id, row.name, row.price, row.stock_qty, row.created_at]
        );
      }
      for (const row of tables.sales ?? []) {
        await db.runAsync(
          `INSERT INTO sales (
            id, sale_number, payment_method, subtotal, amount_paid, balance_due,
            customer_name, customer_phone, due_date, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            row.id,
            row.sale_number,
            row.payment_method,
            row.subtotal,
            row.amount_paid,
            row.balance_due,
            row.customer_name ?? null,
            row.customer_phone ?? null,
            row.due_date ?? null,
            row.created_at,
          ]
        );
      }
      for (const row of tables.sale_items ?? []) {
        await db.runAsync(
          `INSERT INTO sale_items (
            id, sale_id, item_id, name_snapshot, unit_price, quantity, line_total
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            row.id,
            row.sale_id,
            row.item_id,
            row.name_snapshot,
            row.unit_price,
            row.quantity,
            row.line_total,
          ]
        );
      }
      for (const row of tables.stock_movements ?? []) {
        await db.runAsync(
          `INSERT INTO stock_movements (
            id, item_id, type, quantity, reason, ref_id, created_at, note
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            row.id,
            row.item_id,
            row.type,
            row.quantity,
            row.reason,
            row.ref_id,
            row.created_at,
            row.note ?? null,
          ]
        );
      }
      for (const row of tables.payments ?? []) {
        await db.runAsync(
          `INSERT INTO payments (id, sale_id, amount, method, note, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [row.id, row.sale_id, row.amount, row.method, row.note ?? null, row.created_at]
        );
      }
      for (const row of tables.business_profile ?? []) {
        await db.runAsync(
          `INSERT INTO business_profile (
            id, business_name, owner_name, phone, address, email,
            bank_name, account_number, logo_path, reminder_template
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            row.id ?? 1,
            row.business_name,
            row.owner_name ?? null,
            row.phone ?? null,
            row.address ?? null,
            row.email ?? null,
            row.bank_name ?? null,
            row.account_number ?? null,
            row.logo_path ?? null,
            row.reminder_template ?? null,
          ]
        );
      }
      for (const row of tables.app_settings ?? []) {
        await db.runAsync('INSERT INTO app_settings (key, value) VALUES (?, ?)', [
          row.key,
          row.value ?? null,
        ]);
      }
    });
  });
}

export async function clearAllData() {
  await initDb();
  await withDb(async (db) => {
    await db.withTransactionAsync(async () => {
      await db.execAsync('DELETE FROM payments;');
      await db.execAsync('DELETE FROM sale_items;');
      await db.execAsync('DELETE FROM stock_movements;');
      await db.execAsync('DELETE FROM sales;');
      await db.execAsync('DELETE FROM items;');
      await db.execAsync('DELETE FROM business_profile;');
      await db.execAsync('DELETE FROM app_settings;');
    });
  });
}

export async function getItems() {
  return query<{
    id: string;
    name: string;
    price: number;
    stock_qty: number;
  }>('SELECT * FROM items ORDER BY name ASC');
}

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

export async function getItemById(itemId: string) {
  const rows = await query<{
    id: string;
    name: string;
    price: number;
    stock_qty: number;
  }>('SELECT * FROM items WHERE id = ? LIMIT 1', [itemId]);
  return rows[0] ?? null;
}

export async function createItem(params: { name: string; price: number; stockQty: number }) {
  const now = Date.now();
  await execute(
    'INSERT INTO items (id, name, price, stock_qty, created_at) VALUES (?, ?, ?, ?, ?)',
    [makeId('item'), params.name, params.price, params.stockQty, now]
  );
}

export async function updateItem(params: {
  id: string;
  name: string;
  price: number;
  stockQty: number;
}) {
  await execute('UPDATE items SET name = ?, price = ?, stock_qty = ? WHERE id = ?', [
    params.name,
    params.price,
    params.stockQty,
    params.id,
  ]);
}

export async function recordSale(params: {
  items: Array<{ id: string; name: string; price: number; qty: number }>;
  paymentMethod: string;
  subtotal: number;
  amountPaid: number;
  balanceDue: number;
  customerName?: string;
  customerPhone?: string;
  dueDate?: string;
}) {
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
        await db.runAsync(
          `INSERT INTO sale_items (
            id, sale_id, item_id, name_snapshot, unit_price, quantity, line_total
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [makeId('sale_item'), saleId, item.id, item.name, item.price, item.qty, lineTotal]
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
  return { saleId, saleNumber };
}

export async function getSaleById(saleId: string) {
  const rows = await query<{
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
  }>('SELECT * FROM sales WHERE id = ? LIMIT 1', [saleId]);
  return rows[0] ?? null;
}

export async function getSaleItems(saleId: string) {
  return query<{
    id: string;
    name_snapshot: string;
    unit_price: number;
    quantity: number;
    line_total: number;
  }>('SELECT * FROM sale_items WHERE sale_id = ? ORDER BY id ASC', [saleId]);
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
  return query<{
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
  }>('SELECT * FROM sales WHERE balance_due > 0 ORDER BY created_at DESC');
}

export async function recordPayment(params: {
  saleId: string;
  amount: number;
  method: string;
  note?: string;
}) {
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

export async function getPaymentsBySale(saleId: string) {
  return query<{
    id: string;
    amount: number;
    method: string;
    note: string | null;
    created_at: number;
  }>('SELECT * FROM payments WHERE sale_id = ? ORDER BY created_at DESC', [saleId]);
}

export async function markSalePaid(saleId: string, method: string = 'Cash') {
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

export async function adjustStock(params: {
  itemId: string;
  delta: number;
  reason: string;
  note?: string;
}) {
  const createdAt = Date.now();
  await withDb(async (db) => {
    await db.withTransactionAsync(async () => {
      await db.runAsync('UPDATE items SET stock_qty = stock_qty + ? WHERE id = ?', [
        params.delta,
        params.itemId,
      ]);
      await db.runAsync(
        `INSERT INTO stock_movements (
          id, item_id, type, quantity, reason, ref_id, created_at, note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          makeId('stock'),
          params.itemId,
          params.delta >= 0 ? 'in' : 'out',
          Math.abs(params.delta),
          params.reason,
          makeId('adjust'),
          createdAt,
          params.note ?? null,
        ]
      );
    });
  });
}
