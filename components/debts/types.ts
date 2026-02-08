export type Debt = {
    id: string;
    saleNumber: number;
    customerName: string | null;
    customerPhone: string | null;
    balanceDue: number;
    dueDate: string | null;
    createdAt: number;
};

export type PaymentRecord = {
    id: string;
    amount: number;
    method: string;
    note: string | null;
    createdAt: number;
};

export type BusinessProfile = {
    businessName: string;
    ownerName?: string;
    bankName?: string;
    accountNumber?: string;
    reminderTemplate?: string | null;
};

export type AutoReminderSettings = {
    enabled: boolean;
    frequency: 'daily' | 'weekly';
    time: '09:00' | '13:00' | '18:00';
    weekday: number;
};
