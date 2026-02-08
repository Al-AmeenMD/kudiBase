import type { BusinessProfile, Debt } from './types';

export function formatDueDate(dateIso?: string | null): string {
    if (!dateIso) {
        return 'No due date';
    }
    const date = new Date(dateIso);
    return date.toLocaleDateString('en-NG', { day: '2-digit', month: 'short' });
}

export function normalizePhone(phone?: string | null): string | null {
    if (!phone) {
        return null;
    }
    const digits = phone.replace(/\D/g, '');
    if (!digits) {
        return null;
    }
    if (digits.startsWith('0')) {
        return `234${digits.slice(1)}`;
    }
    if (digits.startsWith('234')) {
        return digits;
    }
    return `234${digits}`;
}

export function buildReminderMessage(
    debt: Debt,
    profile: BusinessProfile | null,
    formatCurrency: (value: number) => string
): string {
    const base =
        profile?.reminderTemplate ??
        'Hello {customerName}, this is {businessName}. You have an outstanding balance of {amount}. Please pay to {accountName} ({bankName} {accountNumber}). Thank you.';

    let message = base
        .replace('{customerName}', debt.customerName ?? 'customer')
        .replace('{businessName}', profile?.businessName ?? 'your business')
        .replace('{amount}', formatCurrency(debt.balanceDue))
        .replace('{accountName}', profile?.ownerName ?? 'Account name')
        .replace('{bankName}', profile?.bankName ?? 'Bank')
        .replace('{accountNumber}', profile?.accountNumber ?? '0000000000');

    const hasBusinessPlaceholder = base.includes('{businessName}');
    const hasAccountPlaceholders =
        base.includes('{accountName}') || base.includes('{bankName}') || base.includes('{accountNumber}');

    if (!hasBusinessPlaceholder && profile?.businessName) {
        message = `${message}\nFrom ${profile.businessName}.`;
    }
    if (
        !hasAccountPlaceholders &&
        profile?.ownerName &&
        profile?.bankName &&
        profile?.accountNumber
    ) {
        message = `${message}\nPay to: ${profile.ownerName} (${profile.bankName} ${profile.accountNumber}).`;
    }
    return message;
}

export function getReminderKey(date: Date, frequency: 'daily' | 'weekly'): string {
    if (frequency === 'daily') {
        return date.toISOString().slice(0, 10);
    }
    const weekKey = getIsoWeekKey(date);
    return `week:${weekKey}`;
}

function getIsoWeekKey(date: Date): string {
    const temp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = temp.getUTCDay() || 7;
    temp.setUTCDate(temp.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
    const weekNumber = Math.ceil(((temp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${temp.getUTCFullYear()}-${String(weekNumber).padStart(2, '0')}`;
}
