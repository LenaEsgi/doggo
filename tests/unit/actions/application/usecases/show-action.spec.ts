import { test } from '@japa/runner'
import { ActionNotFoundError } from '#app/modules/actions/domain/exceptions/action-not-found.error'
import Action from '#app/modules/actions/domain/action.entity'
import { FakeActionRepository } from '#tests/unit/fakes/fake-action-repository'
import { ShowActionUseCase } from '#app/modules/actions/application/usecases/show-action.use-case'

test.group('Unit | Actions | ShowActionUseCase', () => {
  test('it should return an action by its id', async ({ assert }) => {
    const fakeRepository = new FakeActionRepository()
    const action = Action.create('SHOW_TEST', 'Show Action', 'show-action', 'Description')
    await fakeRepository.save(action)

    const useCase = new ShowActionUseCase(fakeRepository)
    const result = await useCase.execute({ id: action.id.value })

    assert.equal(result.id.value, action.id.value)
    assert.equal(result.code, 'SHOW_TEST')
    assert.equal(result.name, 'Show Action')
  })

  test('it should throw ActionNotFoundError when action is not found', async ({ assert }) => {
    const fakeRepository = new FakeActionRepository()
    const nonExistentId = 'bc5e0278-f864-44b4-84c6-433b5a932d20'

    const useCase = new ShowActionUseCase(fakeRepository)

    await assert.rejects(
      async () => await useCase.execute({ id: nonExistentId }),
      ActionNotFoundError
    )
  })
})
