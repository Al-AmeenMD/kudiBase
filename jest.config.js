module.exports = {
    preset: 'jest-expo',
    setupFilesAfterEnv: ['./jest.setup.js'],
    transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg)',
    ],
    testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
        // Force expo to use our manual mock instead of loading winter runtime
        '^expo$': '<rootDir>/__mocks__/expo/index.js',
        '^expo/(.*)$': '<rootDir>/__mocks__/expo/index.js',
    },
    collectCoverageFrom: [
        'components/**/*.{ts,tsx}',
        'hooks/**/*.{ts,tsx}',
        'lib/**/*.{ts,tsx}',
        '!**/*.d.ts',
    ],
};
