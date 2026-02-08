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

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
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
