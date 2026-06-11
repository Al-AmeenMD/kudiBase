// Mock expo module to prevent winter runtime issues
jest.mock('expo', () => ({
    registerRootComponent: jest.fn(),
}));

// Mock expo-router
jest.mock('expo-router', () => ({
    useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn(),
        back: jest.fn(),
    }),
    useLocalSearchParams: () => ({}),
    useFocusEffect: jest.fn(),
    Link: 'Link',
    Stack: {
        Screen: 'Screen',
    },
}));

const mockAsyncStorage = new Map();

jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn((key) => Promise.resolve(mockAsyncStorage.get(key) ?? null)),
    setItem: jest.fn((key, value) => {
        mockAsyncStorage.set(key, value);
        return Promise.resolve();
    }),
    removeItem: jest.fn((key) => {
        mockAsyncStorage.delete(key);
        return Promise.resolve();
    }),
}));

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
    openDatabaseAsync: jest.fn(() =>
        Promise.resolve({
            execAsync: jest.fn(),
            runAsync: jest.fn(() => Promise.resolve({ changes: 1 })),
            getAllAsync: jest.fn(() => Promise.resolve([])),
            withTransactionAsync: jest.fn((task) => task()),
        })
    ),
    openDatabaseSync: jest.fn(() => ({
        runSync: jest.fn(),
        getAllSync: jest.fn(() => []),
        getFirstSync: jest.fn(() => null),
        execSync: jest.fn(),
    })),
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
    impactAsync: jest.fn(),
    ImpactFeedbackStyle: {
        Light: 'light',
        Medium: 'medium',
        Heavy: 'heavy',
    },
}));

// Mock react-native-purchases
jest.mock('react-native-purchases', () => ({
    configure: jest.fn(),
    logIn: jest.fn(() => Promise.resolve({ customerInfo: { entitlements: { active: {} } }, created: false })),
    logOut: jest.fn(() => Promise.resolve({ entitlements: { active: {} } })),
    getCustomerInfo: jest.fn(() => Promise.resolve({ entitlements: { active: {} } })),
    getOfferings: jest.fn(() => Promise.resolve({ current: null })),
    purchasePackage: jest.fn(),
    restorePurchases: jest.fn(),
}));

// Mock react-native-purchases-ui
jest.mock('react-native-purchases-ui', () => ({
    presentPaywall: jest.fn(),
}));

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
    requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
    scheduleNotificationAsync: jest.fn(),
    cancelAllScheduledNotificationsAsync: jest.fn(),
    setNotificationHandler: jest.fn(),
}));

// Silence console warnings in tests
const originalWarn = console.warn;
console.warn = (...args) => {
    if (
        args[0]?.includes?.('NativeEventEmitter') ||
        args[0]?.includes?.('Require cycle')
    ) {
        return;
    }
    originalWarn.apply(console, args);
};
