import { test } from '@japa/runner'
import { ActionNotFoundError } from '#app/modules/actions/domain/exceptions/action-not-found.error'
import Action from '#app/modules/actions/domain/action.entity'
import { ToggleActionUseCase } from '#app/modules/actions/application/usecases/toggle-action.use-case'
import { ToggleActionDto } from '#app/modules/actions/application/dto/toggle-action.dto'
import { FakeActionRepository } from '#tests/unit/fakes/fake-action-repository'

test.group('Unit | Actions | ToggleActionUseCase', () => {
  test('it should reactivate a deactivated action', async ({ assert }) => {
    const fakeRepository = new FakeActionRepository()
    const action = Action.create('BARK', 'Aboyer', 'bark', null)
    action.deactivate()
    await fakeRepository.save(action)

    const useCase = new ToggleActionUseCase(fakeRepository)
    await useCase.execute(new ToggleActionDto(action.id.value, true))

    const updated = await fakeRepository.findById(action.id)
    assert.isTrue(updated?.isActive)
  })

  test('it should deactivate an active action', async ({ assert }) => {
    const fakeRepository = new FakeActionRepository()
    const action = Action.create('BARK', 'Aboyer', 'bark', null)
    await fakeRepository.save(action)

    const useCase = new ToggleActionUseCase(fakeRepository)
    await useCase.execute(new ToggleActionDto(action.id.value, false))

    const updated = await fakeRepository.findById(action.id)
    assert.isFalse(updated?.isActive)
  })

  test('it should throw ActionNotFoundError when action does not exist', async ({ assert }) => {
    const fakeRepository = new FakeActionRepository()
    const nonExistentId = '550e8400-e29b-41d4-a716-446655440000'

    const useCase = new ToggleActionUseCase(fakeRepository)

    await assert.rejects(
      async () => await useCase.execute(new ToggleActionDto(nonExistentId, true)),
      ActionNotFoundError
    )
  })
})
