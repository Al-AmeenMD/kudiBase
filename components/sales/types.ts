export type PaymentMethod = 'Cash' | 'Transfer' | 'POS' | 'Pay Later';

export type Item = {
    id: string;
    name: string;
    price: number;
    cost: number;
    stock: number;
};

export type CartItem = Item & {
    qty: number;
};

export type SalesSummary = {
    totalSales: number;
    totalPaid: number;
    totalDue: number;
    saleCount: number;
    byMethod: {
        method: string;
        totalSales: number;
        totalPaid: number;
        totalDue: number;
        saleCount: number;
    }[];
};
