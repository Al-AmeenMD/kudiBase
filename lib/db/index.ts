// Re-export all database functions for backwards compatibility
// All imports from '@/lib/db' will continue to work

export { execute, getDb, makeId, query, withDb } from './connection';
export type { SqlParams } from './connection';

export { initDb } from './schema';

export {
    getAllAppSettings,
    getAppSetting,
    getBusinessProfile,
    setAppSetting,
    upsertBusinessProfile
} from './settings';
export type { BusinessProfile } from './settings';

export {
    adjustStock,
    createItem,
    getDeadStockItems,
    getItemById,
    getItems,
    updateItem
} from './items';
export type { Item } from './items';

export {
    getDailyProfitTotals,
    getDailySalesTotals,
    getOutstandingSales,
    getPayLaterSettlementDurations,
    getProfitSummary,
    getRecentCustomers,
    getRecentSalesTotals,
    getSaleById,
    getSaleItems,
    getSalesList,
    getSalesSummary,
    getTopCustomers,
    getTopProfitItems,
    getTopRepeatCustomers,
    getTopSellingItems,
    recordSale
} from './sales';
export type { Sale, SaleItem } from './sales';

export { getPaymentsBySale, markSalePaid, recordPayment } from './payments';
export type { Payment } from './payments';

export { clearAllData, exportData, importData } from './import-export';
export type { ExportPayload } from './import-export';
