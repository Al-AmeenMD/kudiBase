import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

export type SqlParams = (string | number | null)[];

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let dbQueue: Promise<unknown> = Promise.resolve();

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
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

export async function withDb<T>(task: (db: SQLite.SQLiteDatabase) => Promise<T>): Promise<T> {
    const run = async () => {
        try {
            const db = await getDb();
            return await task(db);
        } catch (error) {
            const message = String(error ?? '');
            if (
                message.includes('NativeDatabase') ||
                message.includes('released') ||
                message.includes('prepareAsync') ||
                message.includes('NullPointerException')
            ) {
                dbPromise = null;
                const db = await getDb();
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
