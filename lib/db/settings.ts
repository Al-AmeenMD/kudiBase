import { emitSettingChange } from '@/lib/settings-events';
import { emitDbEvent } from '@/lib/db/events';

import { execute, query } from './connection';

export type BusinessProfile = {
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
};

export async function getBusinessProfile(): Promise<BusinessProfile | null> {
    const rows = await query<BusinessProfile>('SELECT * FROM business_profile WHERE id = 1 LIMIT 1');
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
}): Promise<void> {
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
    emitSettingChange('business_profile', params.businessName);
    emitDbEvent('profile');
}

export async function getAppSetting(key: string): Promise<string | null> {
    const rows = await query<{ value: string | null }>('SELECT value FROM app_settings WHERE key = ? LIMIT 1', [key]);
    return rows[0]?.value ?? null;
}

export async function setAppSetting(key: string, value: string): Promise<void> {
    await execute(
        `INSERT INTO app_settings (key, value)
     VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [key, value]
    );
    emitSettingChange(key, value);
}

export async function getAllAppSettings(): Promise<Array<{ key: string; value: string | null }>> {
    return query<{ key: string; value: string | null }>('SELECT key, value FROM app_settings');
}
