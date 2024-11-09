module.exports = {
  testEnvironment: "jsdom",
  verbose: true,
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "clover"],
  testMatch: ["**/__tests__/**/*.js", "**/*.test.js"],
  transform: {
    "^.+\\.js$": "babel-jest",
  },
  setupFilesAfterEnv: ["./jest.setup.js"],
};
