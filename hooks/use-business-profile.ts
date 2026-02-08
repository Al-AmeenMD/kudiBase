import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { getBusinessProfile, initDb } from '@/lib/db';

export type BusinessProfile = {
    id: number;
    businessName: string;
    ownerName: string | null;
    phone: string | null;
    address: string | null;
    email: string | null;
    bankName: string | null;
    accountNumber: string | null;
    logoPath: string | null;
    reminderTemplate: string | null;
};

type UseBusinessProfileResult = {
    profile: BusinessProfile | null;
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
};

export function useBusinessProfile(): UseBusinessProfileResult {
    const [profile, setProfile] = useState<BusinessProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const refresh = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            await initDb();
            const row = await getBusinessProfile();
            if (row) {
                setProfile({
                    id: row.id,
                    businessName: row.business_name,
                    ownerName: row.owner_name,
                    phone: row.phone,
                    address: row.address,
                    email: row.email,
                    bankName: row.bank_name,
                    accountNumber: row.account_number,
                    logoPath: row.logo_path,
                    reminderTemplate: row.reminder_template,
                });
            } else {
                setProfile(null);
            }
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to load profile'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    useFocusEffect(
        useCallback(() => {
            refresh();
        }, [refresh])
    );

    return { profile, loading, error, refresh };
}
