// Static analysis for the CSE 3311 homework: the project's lint rules plus typescript-eslint's
// type-aware "strict" set. Kept separate so `npx expo lint` stays at 0 problems.
// Run: npm run analyze   (report: npm run analyze:report -> static-analysis-report.txt)
const { defineConfig } = require('eslint/config');
const tseslint = require('@typescript-eslint/eslint-plugin');
const baseConfig = require('./eslint.config.js');

module.exports = defineConfig([
  baseConfig,
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [tseslint.configs['flat/strict-type-checked']],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: __dirname },
    },
  },
  {
    // Generated OSM data: thousands of lines, nothing to analyze.
    ignores: ['src/data/campus-*.ts'],
  },
]);
