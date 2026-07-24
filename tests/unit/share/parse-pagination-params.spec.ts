import { test } from '@japa/runner'
import type { HttpContext } from '@adonisjs/core/http'
import { parsePaginationParams } from '#app/modules/share/utils/parse-pagination-params'

function fakeRequest(query: Record<string, string>): HttpContext['request'] {
  return {
    input: (key: string, defaultValue?: unknown) => query[key] ?? defaultValue,
  } as unknown as HttpContext['request']
}

test.group('parsePaginationParams', () => {
  test('applies defaults when no query params are given', ({ assert }) => {
    const result = parsePaginationParams(fakeRequest({}))
    assert.deepEqual(result, { page: 1, limit: 20, search: undefined })
  })

  test('parses page and limit from query params', ({ assert }) => {
    const result = parsePaginationParams(fakeRequest({ page: '3', limit: '50' }))
    assert.equal(result.page, 3)
    assert.equal(result.limit, 50)
  })

  test('clamps limit to 100 max', ({ assert }) => {
    const result = parsePaginationParams(fakeRequest({ limit: '5000' }))
    assert.equal(result.limit, 100)
  })

  test('clamps page to 1 minimum', ({ assert }) => {
    const result = parsePaginationParams(fakeRequest({ page: '-5' }))
    assert.equal(result.page, 1)
  })

  test('clamps limit to 1 minimum', ({ assert }) => {
    const result = parsePaginationParams(fakeRequest({ limit: '0' }))
    assert.equal(result.limit, 1)
  })

  test('honors a custom defaultLimit option', ({ assert }) => {
    const result = parsePaginationParams(fakeRequest({}), { defaultLimit: 25 })
    assert.equal(result.limit, 25)
  })

  test('passes through search when present', ({ assert }) => {
    const result = parsePaginationParams(fakeRequest({ search: 'ali' }))
    assert.equal(result.search, 'ali')
  })

  test('normalizes an empty search to undefined', ({ assert }) => {
    const result = parsePaginationParams(fakeRequest({ search: '' }))
    assert.isUndefined(result.search)
  })
})
