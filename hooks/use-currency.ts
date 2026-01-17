import { useEffect, useMemo, useState } from 'react';

import { getAppSetting, initDb } from '@/lib/db';
import { subscribeSettings } from '@/lib/settings-events';

type CurrencyCode =
  | 'NGN'
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'CAD'
  | 'AUD'
  | 'NZD'
  | 'CHF'
  | 'JPY'
  | 'CNY'
  | 'INR'
  | 'SGD'
  | 'HKD'
  | 'KRW'
  | 'AED'
  | 'SAR'
  | 'ZAR'
  | 'KES'
  | 'GHS'
  | 'EGP'
  | 'MAD'
  | 'TND'
  | 'TRY'
  | 'ILS'
  | 'BRL'
  | 'MXN'
  | 'ARS'
  | 'CLP'
  | 'COP'
  | 'PEN'
  | 'PKR'
  | 'BDT'
  | 'VND'
  | 'IDR'
  | 'PHP'
  | 'THB'
  | 'MYR';

const defaultCurrency: CurrencyCode = 'NGN';

export function useCurrency() {
  const [currency, setCurrency] = useState<CurrencyCode>(defaultCurrency);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      await initDb();
      const value = await getAppSetting('currency');
      if (!isMounted) {
        return;
      }
      if (value) {
        setCurrency(value as CurrencyCode);
      }
    }
    load().catch(() => {});
    const unsubscribe = subscribeSettings((key, value) => {
      if (!isMounted || key !== 'currency') {
        return;
      }
      if (value) {
        setCurrency(value as CurrencyCode);
      }
    });
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const formatter = useMemo(() => {
    try {
      return new Intl.NumberFormat('en', {
        style: 'currency',
        currency,
        currencyDisplay: 'symbol',
      });
    } catch {
      return null;
    }
  }, [currency]);

  const format = useMemo(() => {
    return (amount: number) => {
      if (currency === 'NGN') {
        return `₦${amount.toLocaleString('en-NG')}`;
      }
      if (formatter) {
        return formatter.format(amount);
      }
      return `${currency} ${amount.toLocaleString('en')}`;
    };
  }, [currency, formatter]);

  const display = useMemo(() => {
    if (currency === 'NGN') {
      return '₦';
    }
    return currency;
  }, [currency]);

  return { currency, display, format };
}
