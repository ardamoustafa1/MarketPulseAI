// ESLint v9 flat config for the MarketPulse mobile app.
//
// Goals:
//   - TypeScript-aware linting via `typescript-eslint` (recommended preset).
//   - Enforce `react-hooks/rules-of-hooks` + `react-hooks/exhaustive-deps`.
//   - Apply React-style JSX rules only to .tsx/.jsx files.
//   - Stay pragmatic: report real bugs as errors, style/naming as warnings.

const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const reactPlugin = require('eslint-plugin-react');
const reactHooksPlugin = require('eslint-plugin-react-hooks');

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'android/**',
      'ios/**',
      'dist/**',
      'build/**',
      '.expo/**',
      '.expo-shared/**',
      'coverage/**',
      'babel.config.js',
      'metro.config.js',
      'eslint.config.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        __DEV__: 'readonly',
        console: 'readonly',
        process: 'readonly',
        require: 'readonly',
        module: 'writable',
        exports: 'writable',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        WebSocket: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        AbortController: 'readonly',
      },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // Hooks: real bug risk, must fail build.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // React best practices scoped to the patterns we use.
      'react/jsx-uses-react': 'off', // RN 0.81 + RN/Expo autoinject.
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-vars': 'error',
      'react/jsx-key': 'error',
      'react/no-unescaped-entities': 'off',

      // TypeScript tuning: keep noise low while surfacing real issues.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/ban-ts-comment': [
        'warn',
        { 'ts-ignore': 'allow-with-description', 'ts-expect-error': false },
      ],
      '@typescript-eslint/no-require-imports': 'off',

      // Core JS: loosen a few rules that are noisy in RN codebases.
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-case-declarations': 'off',
      'no-useless-escape': 'warn',
    },
  },
];
