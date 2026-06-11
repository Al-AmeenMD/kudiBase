import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

export type SqlParams = (string | number | null)[];

const DEFAULT_DB_NAME = 'kudibase.db';

let activeDbName = DEFAULT_DB_NAME;
const dbPromises = new Map<string, Promise<SQLite.SQLiteDatabase>>();
let dbQueue: Promise<unknown> = Promise.resolve();

function sanitizeUserId(userId: string): string {
    return userId.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export function setActiveLocalUser(userId: string | null): void {
    activeDbName = userId ? `kudibase-${sanitizeUserId(userId)}.db` : DEFAULT_DB_NAME;
}

export function getActiveDbName(): string {
    return activeDbName;
}

export async function getDb(dbName: string = activeDbName): Promise<SQLite.SQLiteDatabase> {
    if (Platform.OS === 'web') {
        throw new Error('SQLite is not supported on web. Use a device or emulator.');
    }
    if (!SQLite.openDatabaseAsync) {
        throw new Error(
            'expo-sqlite native module not loaded. Restart Metro with -c and ensure expo-sqlite is installed.'
        );
    }
    if (!dbPromises.has(dbName)) {
        dbPromises.set(dbName, SQLite.openDatabaseAsync(dbName));
    }
    return dbPromises.get(dbName)!;
}

export async function withDb<T>(task: (db: SQLite.SQLiteDatabase) => Promise<T>): Promise<T> {
    const dbName = activeDbName;
    const run = async () => {
        try {
            const db = await getDb(dbName);
            return await task(db);
        } catch (error) {
            const message = String(error ?? '');
            if (
                message.includes('NativeDatabase') ||
                message.includes('released') ||
                message.includes('prepareAsync') ||
                message.includes('NullPointerException')
            ) {
                dbPromises.delete(dbName);
                const db = await getDb(dbName);
                return await task(db);
            }
            throw error;
        }
    };

    // Serialize DB access to avoid concurrent native calls causing NPEs on low-end devices.
    const next = dbQueue.then(run, run);
    dbQueue = next.then(
        () => undefined,
        () => undefined
    );
    return next;
}

export async function execute(sql: string, params: SqlParams = []): Promise<void> {
    await withDb(async (db) => {
        if (params.length === 0) {
            await db.execAsync(sql);
        } else {
            await db.runAsync(sql, params);
        }
    });
}

export async function query<T>(sql: string, params: SqlParams = []): Promise<T[]> {
    return withDb((db) => db.getAllAsync<T>(sql, params));
}

export function makeId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
