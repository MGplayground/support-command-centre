import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    moduleNameMapper: {
        // Handle @/ path aliases defined in tsconfig
        '^@/(.*)$': '<rootDir>/src/$1',
        // Handle CSS imports
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    },
    testMatch: [
        '**/__tests__/**/*.test.ts',
        '**/__tests__/**/*.test.tsx',
    ],
    transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
            tsconfig: {
                jsx: 'react-jsx',
            }
        }],
    },
};

export default config;
