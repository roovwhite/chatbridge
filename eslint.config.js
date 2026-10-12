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
      // Порядок импортов; группы разделяются пустой строкой:
      // 1) import type  2) внешние пакеты  3) алиас @/  4) относительные (стили, соседние файлы).
      // Побочные импорты (import 'x') стоят в своей группе по источнику.
      // Исправляется автоматически: npm run lint -- --fix
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

      // Типы импортируются отдельной инструкцией: import type { A } from 'x'.
      // Так при verbatimModuleSyntax импорт стирается целиком, а не остаётся побочным import 'x'.
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
