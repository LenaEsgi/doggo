import { test } from '@japa/runner'
import { LucidUnitOfWork } from '#app/modules/share/infrastructure/database/lucid-unit-of-work'

test.group('LucidUnitOfWork', () => {
  test('propage la valeur de retour du travail', async ({ assert }) => {
    const uow = new LucidUnitOfWork()
    const result = await uow.run(async () => 42)
    assert.equal(result, 42)
  })

  test('propage les erreurs (rollback)', async ({ assert }) => {
    const uow = new LucidUnitOfWork()
    await assert.rejects(
      () =>
        uow.run(async () => {
          throw new Error('boom')
        }),
      'boom'
    )
  })
})
