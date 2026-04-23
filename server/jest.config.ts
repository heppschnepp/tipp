import type { Config } from "jest";
import { defaults as tsjDefaults } from "ts-jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.ts", "**/?(*.)+(spec|test).ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.ts"],
  globalSetup: "<rootDir>/src/__tests__/global-setup.ts",
  globalTeardown: "<rootDir>/src/__tests__/global-teardown.ts",
  timeout: 30000,
};

export default config;
