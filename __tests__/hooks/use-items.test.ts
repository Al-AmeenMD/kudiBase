import { useItems } from '@/hooks/use-items';
import * as db from '@/lib/db';
import { renderHook, waitFor } from '@testing-library/react-native';

// Mock the db module
jest.mock('@/lib/db', () => ({
    initDb: jest.fn(() => Promise.resolve()),
    getItems: jest.fn(() => Promise.resolve([])),
}));

describe('useItems', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should start with loading true', async () => {
        const { result } = renderHook(() => useItems());
        expect(result.current.loading).toBe(true);

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });
    });

    it('should return empty items array initially', async () => {
        const { result } = renderHook(() => useItems());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.items).toEqual([]);
    });

    it('should fetch items from database', async () => {
        const mockItems = [
            { id: '1', name: 'Phone Charger', price: 3000, cost_price: 2000, stock_qty: 10 },
            { id: '2', name: 'USB Cable', price: 1200, cost_price: 800, stock_qty: 20 },
        ];

        (db.getItems as jest.Mock).mockResolvedValueOnce(mockItems);

        const { result } = renderHook(() => useItems());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.items).toHaveLength(2);
        expect(result.current.items[0].name).toBe('Phone Charger');
        expect(result.current.items[0].costPrice).toBe(2000);
    });

    it('should set error on fetch failure', async () => {
        (db.getItems as jest.Mock).mockRejectedValueOnce(new Error('DB error'));

        const { result } = renderHook(() => useItems());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.error).toBeInstanceOf(Error);
        expect(result.current.error?.message).toBe('DB error');
    });

    it('should have refresh function', async () => {
        const { result } = renderHook(() => useItems());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(typeof result.current.refresh).toBe('function');
    });
});
