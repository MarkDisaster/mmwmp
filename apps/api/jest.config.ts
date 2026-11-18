import { readFileSync } from 'node:fs';
import path from 'node:path';

import type { Config } from 'jest';
import { pathsToModuleNameMapper } from 'ts-jest';

const { compilerOptions } = JSON.parse(readFileSync(path.resolve('tsconfig.json'), 'utf8')) as {
   compilerOptions: { paths?: Record<string, string[]> };
};

const config: Config = {
   displayName: 'api',
   testEnvironment: 'node',
   transform: {
      '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
   },
   moduleFileExtensions: ['ts', 'js', 'json'],
   rootDir: '.',
   testMatch: ['<rootDir>/test/src/**/*.test.ts'],
   moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths ?? {}, {
      prefix: '<rootDir>/',
   }),
   globalSetup: '<rootDir>/test/setup/global-setup.ts',
   globalTeardown: '<rootDir>/test/setup/global-teardown.ts',
   setupFilesAfterEnv: ['<rootDir>/test/setup/init.ts'],
   maxWorkers: 1,
   testTimeout: 30000,
};

export default config;
