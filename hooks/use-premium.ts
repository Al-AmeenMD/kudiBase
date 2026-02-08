import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { isPremium as checkPremium } from '@/lib/subscription';

type UsePremiumResult = {
    isPremium: boolean;
    loading: boolean;
    refresh: () => Promise<void>;
};

export function usePremium(): UsePremiumResult {
    const [premium, setPremium] = useState(false);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        try {
            setLoading(true);
            const status = await checkPremium();
            setPremium(status);
        } catch {
            setPremium(false);
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

    return { isPremium: premium, loading, refresh };
}
