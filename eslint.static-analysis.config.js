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
