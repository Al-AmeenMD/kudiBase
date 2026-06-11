import AsyncStorage from '@react-native-async-storage/async-storage';

import { setActiveLocalUser } from './connection';
import { exportData, importData, type ExportPayload } from './import-export';
import { initDb } from './schema';

const ACTIVE_LOCAL_USER_KEY = 'kudibase_active_local_user_id';
const LEGACY_MIGRATION_KEY = 'kudibase_legacy_migrated_to_user_id';

function payloadHasShopData(payload: ExportPayload): boolean {
    const tables = payload.tables;
    return (
        tables.items.length > 0 ||
        tables.sales.length > 0 ||
        tables.sale_items.length > 0 ||
        tables.stock_movements.length > 0 ||
        tables.payments.length > 0 ||
        tables.business_profile.length > 0
    );
}

export async function activateLocalDataForUser(userId: string): Promise<void> {
    const [activeUserId, migratedToUserId] = await Promise.all([
        AsyncStorage.getItem(ACTIVE_LOCAL_USER_KEY),
        AsyncStorage.getItem(LEGACY_MIGRATION_KEY),
    ]);

    if (activeUserId === userId) {
        setActiveLocalUser(userId);
        await initDb();
        return;
    }

    let legacyPayload: ExportPayload | null = null;
    if (!activeUserId && !migratedToUserId) {
        setActiveLocalUser(null);
        await initDb();
        const payload = await exportData();
        if (payloadHasShopData(payload)) {
            legacyPayload = payload;
        }
    }

    setActiveLocalUser(userId);
    await initDb();

    if (legacyPayload) {
        const currentPayload = await exportData();
        if (!payloadHasShopData(currentPayload)) {
            await importData(legacyPayload as unknown as {
                schema_version: number;
                tables: Record<string, Array<Record<string, unknown>>>;
            });
        }
        await AsyncStorage.setItem(LEGACY_MIGRATION_KEY, userId);
    }

    await AsyncStorage.setItem(ACTIVE_LOCAL_USER_KEY, userId);
}

export async function deactivateLocalDataUser(): Promise<void> {
    setActiveLocalUser(null);
    await AsyncStorage.removeItem(ACTIVE_LOCAL_USER_KEY);
}
