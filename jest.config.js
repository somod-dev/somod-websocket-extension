/* eslint-disable */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/tests/**/**.test.ts"],
  collectCoverageFrom: ["serverless/**/*.ts"],
  coverageReporters: ["text", "lcov"],
  transform: {
    "^.+\\.tsx?$": "ts-jest" // for ts & tsx files
  },
  modulePathIgnorePatterns: ["<rootDir>/build/"]
};
