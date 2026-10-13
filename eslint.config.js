import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      // группы импортов через пустую строку: типы, пакеты, алиас @/, относительные
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            // import type из любого источника
            ['^.+\\u0000$'],
            // внешние пакеты
            ['^\\u0000@?\\w', '^@?\\w'],
            // алиас @/
            ['^\\u0000@/', '^@/'],
            // относительные пути
            ['^\\u0000\\.', '^\\.'],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',

      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ImportSpecifier[importKind="type"]',
          message: "Импортируйте типы отдельной инструкцией: import type { A } from 'x'.",
        },
      ],
    },
  },
])
