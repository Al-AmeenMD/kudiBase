import { getActiveDbName, setActiveLocalUser, withDb } from '@/lib/db/connection';

const openedDatabases: string[] = [];

jest.mock('expo-sqlite', () => ({
    openDatabaseAsync: jest.fn((name: string) => {
        openedDatabases.push(name);
        return Promise.resolve({
            execAsync: jest.fn(),
            runAsync: jest.fn(() => Promise.resolve({ changes: 1 })),
            getAllAsync: jest.fn(() => Promise.resolve([])),
            withTransactionAsync: jest.fn((task) => task()),
        });
    }),
}));

describe('db connection account switching', () => {
    beforeEach(() => {
        openedDatabases.length = 0;
        setActiveLocalUser(null);
    });

    it('uses a separate database name per local user', async () => {
        setActiveLocalUser('user-one');
        await withDb(async () => {});

        setActiveLocalUser('user-two');
        await withDb(async () => {});

        expect(openedDatabases).toContain('kudibase-user-one.db');
        expect(openedDatabases).toContain('kudibase-user-two.db');
        expect(getActiveDbName()).toBe('kudibase-user-two.db');
    });

    it('captures the active database before queued work runs', async () => {
        setActiveLocalUser('queued-user');
        const queuedWork = withDb(async () => {});

        setActiveLocalUser('next-user');
        await queuedWork;
        await withDb(async () => {});

        expect(openedDatabases[0]).toBe('kudibase-queued-user.db');
        expect(openedDatabases[1]).toBe('kudibase-next-user.db');
    });
});
