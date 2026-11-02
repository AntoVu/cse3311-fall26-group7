// Strict, type-aware lint for developer_documents/STATIC_ANALYSIS.md: npx eslint -c eslint.static-analysis.config.js src
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
  { ignores: ['src/data/campus-*.ts', 'src/data/indoor/**'] },
]);
