import { configApp } from '@adonisjs/eslint-config'
import unicorn from 'eslint-plugin-unicorn'

export default [
  ...configApp({
    plugins: {
      unicorn,
    },
    rules: {
      'unicorn/filename-case': [
        'error',
        {
          cases: {
            kebabCase: true,
          },
        },
      ],
      '@unicorn/filename-case': 'off',
    },
  }),
  {
    files: [
      'database/migrations/**/*.ts',
      'providers/*.ts',
      'app/middleware/*.ts'
    ],
    rules: {
      'unicorn/filename-case': 'off',
    },
  },
]
