import { readFileSync } from 'node:fs';
import path from 'node:path';

import type { Config } from 'jest';
import { pathsToModuleNameMapper } from 'ts-jest';

const { compilerOptions } = JSON.parse(readFileSync(path.resolve('tsconfig.json'), 'utf8')) as {
   compilerOptions: { paths?: Record<string, string[]> };
};

const config: Config = {
   displayName: 'api-unit',
   testEnvironment: 'node',
   transform: {
      '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
   },
   moduleFileExtensions: ['ts', 'js', 'json'],
   rootDir: '.',
   testMatch: ['<rootDir>/src/**/*.spec.ts'],
   moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths ?? {}, {
      prefix: '<rootDir>/',
   }),
   setupFilesAfterEnv: ['<rootDir>/test/unit-setup.ts'],
   testTimeout: 10000,
};

export default config;
