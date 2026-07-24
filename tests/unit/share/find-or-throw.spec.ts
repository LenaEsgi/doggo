import { test } from '@japa/runner'
import { findOrThrow, assertExistsOrThrow } from '#app/modules/share/utils/find-or-throw'

class FakeNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`not found: ${id}`)
  }
}

test.group('findOrThrow', () => {
  test('returns the value when the finder resolves to a non-null result', async ({ assert }) => {
    const result = await findOrThrow(async () => ({ id: '1' }), FakeNotFoundError, '1')
    assert.deepEqual(result, { id: '1' })
  })

  test('throws the given error constructed with the id when the finder resolves to null', async ({
    assert,
  }) => {
    await assert.rejects(() => findOrThrow(async () => null, FakeNotFoundError, 'missing-id'), FakeNotFoundError)
  })

  test('throws when the finder resolves to undefined', async ({ assert }) => {
    await assert.rejects(
      () => findOrThrow(async () => undefined, FakeNotFoundError, 'missing-id'),
      FakeNotFoundError
    )
  })
})

test.group('assertExistsOrThrow', () => {
  test('resolves without throwing when exists() returns true', async ({ assert }) => {
    await assert.doesNotReject(() => assertExistsOrThrow(async () => true, FakeNotFoundError, '1'))
  })

  test('throws the given error constructed with the id when exists() returns false', async ({
    assert,
  }) => {
    await assert.rejects(
      () => assertExistsOrThrow(async () => false, FakeNotFoundError, 'missing-id'),
      FakeNotFoundError
    )
  })
})
