import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';
import perfectionist from 'eslint-plugin-perfectionist';

export default [
  // Base ESLint recommended rules
  eslint.configs.recommended,

  // Ignore patterns - ignore everything except src/ and this config
  {
    ignores: ['**/*', '!src/**', '!eslint.config.mjs'],
  },

  // Perfectionist recommended config (natural sorting)
  perfectionist.configs['recommended-natural'],

  // TypeScript configuration
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      globals: {
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        console: 'readonly',
        process: 'readonly',
      },
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2020,
        project: './tsconfig.json',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...tseslint.configs['recommended-requiring-type-checking'].rules,
    },
  },

  // Prettier compatibility (disables conflicting rules)
  prettier,
];
