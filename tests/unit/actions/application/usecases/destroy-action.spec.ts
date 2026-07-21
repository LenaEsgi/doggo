import { test } from '@japa/runner'
import { ActionNotFoundError } from '#app/modules/actions/domain/exceptions/action-not-found.error'
import Action from '#app/modules/actions/domain/action.entity'
import { DestroyActionUseCase } from '#app/modules/actions/application/usecases/destroy-action.use-case'
import { FakeActionRepository } from '#tests/unit/fakes/fake-action-repository'

test.group('Unit | Actions | DestroyActionUseCase', () => {
  test('it should deactivate an existing action instead of deleting it', async ({ assert }) => {
    const fakeRepository = new FakeActionRepository()
    const action = Action.create('DEACTIVATE_ME', 'Deactivate Me', 'deactivate-me', null)
    await fakeRepository.save(action)

    const useCase = new DestroyActionUseCase(fakeRepository)
    await useCase.execute({ id: action.id.value })

    assert.equal(fakeRepository.actions.length, 1)
    const stillThere = await fakeRepository.findById(action.id)
    assert.isNotNull(stillThere)
    assert.isFalse(stillThere?.isActive)
  })

  test('it should throw ActionNotFoundError when action does not exist', async ({ assert }) => {
    const fakeRepository = new FakeActionRepository()
    const nonExistentId = '550e8400-e29b-41d4-a716-446655440000'

    const useCase = new DestroyActionUseCase(fakeRepository)

    await assert.rejects(
      async () => await useCase.execute({ id: nonExistentId }),
      ActionNotFoundError
    )
  })
})
