module.exports = {
    collectCoverage: true,
    collectCoverageFrom: [
      "src/**/*.ts?(x)",
      "!src/**/*.d.ts?(x)",
      "!src/examples/**/*"
    ],
    coverageDirectory: "__coverage__",
    testMatch: [
      "**/src/**/*.test.*"
    ],
    moduleFileExtensions: [
      "ts",
      "tsx",
      "js"
    ],
    moduleDirectories: [
      "node_modules",
      "src"
    ],
    preset: "ts-jest"
}