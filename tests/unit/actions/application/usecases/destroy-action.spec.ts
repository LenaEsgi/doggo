import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { ActionRepository } from '#app/modules/actions/domain/contracts/action.repository'
import { ActionNotFoundError } from '#app/modules/actions/domain/exceptions/action-not-found.error'
import Action from '#app/modules/actions/domain/action.entity'
import { DestroyActionUseCase } from '#app/modules/actions/application/usecases/destroy-action.use-case'
import { FakeActionRepository } from '#tests/unit/fakes/fake-action-repository'

test.group('Unit | Actions | DestroyActionUseCase', () => {
  test('it should delete an existing action', async ({ assert, cleanup }) => {
    const fakeRepository = new FakeActionRepository()
    const action = Action.create('DELETE_ME', 'Delete Me', 'delete-me', null)
    await fakeRepository.save(action)

    app.container.swap(ActionRepository, () => fakeRepository)
    cleanup(() => app.container.restore(ActionRepository))

    const useCase = await app.container.make(DestroyActionUseCase)

    await useCase.execute({ id: action.id.value })

    assert.equal(fakeRepository.actions.length, 0)
    assert.isNull(await fakeRepository.findById(action.id))
  })

  test('it should throw ActionNotFoundError when action does not exist', async ({
    assert,
    cleanup,
  }) => {
    const fakeRepository = new FakeActionRepository()

    app.container.swap(ActionRepository, () => fakeRepository)
    cleanup(() => app.container.restore(ActionRepository))

    const useCase = await app.container.make(DestroyActionUseCase)
    const nonExistentId = '550e8400-e29b-41d4-a716-446655440000'

    await assert.rejects(
      async () => await useCase.execute({ id: nonExistentId }),
      ActionNotFoundError
    )
  })
})
