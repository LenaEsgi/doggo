import { test } from '@japa/runner'
import { ActionNotFoundError } from '#app/modules/actions/domain/exceptions/action-not-found.error'
import Action from '#app/modules/actions/domain/action.entity'
import { FakeActionRepository } from '#tests/unit/fakes/fake-action-repository'
import { UpdateActionUseCase } from '#app/modules/actions/application/usecases/update-action.use-case'

test.group('Unit | Actions | UpdateActionUseCase', () => {
  test('it should update an existing action', async ({ assert }) => {
    const fakeRepository = new FakeActionRepository()
    const action = Action.create('OLD_CODE', 'Old Name', 'old-slug', 'Old Desc')
    await fakeRepository.save(action)

    const useCase = new UpdateActionUseCase(fakeRepository)

    await useCase.execute({
      id: action.id.value,
      name: 'New Name',
      slug: 'new-slug',
      description: 'New Desc',
    })

    const updated = await fakeRepository.findById(action.id)
    assert.equal(updated?.name, 'New Name')
    assert.equal(updated?.slug, 'new-slug')
    assert.equal(updated?.description, 'New Desc')
  })

  test('it should update only provided fields', async ({ assert }) => {
    const fakeRepository = new FakeActionRepository()
    const action = Action.create('CODE', 'Original Name', 'original-slug', 'Original Desc')
    await fakeRepository.save(action)

    const useCase = new UpdateActionUseCase(fakeRepository)

    await useCase.execute({
      id: action.id.value,
      name: 'Updated Name',
    })

    const updated = await fakeRepository.findById(action.id)
    assert.equal(updated?.name, 'Updated Name')
    assert.equal(updated?.slug, 'original-slug')
    assert.equal(updated?.description, 'Original Desc')
  })

  test('it should throw ActionNotFoundError when action does not exist', async ({ assert }) => {
    const fakeRepository = new FakeActionRepository()
    const nonExistentId = 'bc5e0278-f864-44b4-84c6-433b5a932d20'

    const useCase = new UpdateActionUseCase(fakeRepository)

    await assert.rejects(
      async () => await useCase.execute({ id: nonExistentId, name: 'New Name' }),
      ActionNotFoundError
    )
  })

  test('it should update description to null when provided', async ({ assert }) => {
    const fakeRepository = new FakeActionRepository()
    const action = Action.create('CODE', 'Name', 'slug', 'Some description')
    await fakeRepository.save(action)

    const useCase = new UpdateActionUseCase(fakeRepository)

    await useCase.execute({
      id: action.id.value,
      description: null,
    })

    const updated = await fakeRepository.findById(action.id)
    assert.isNull(updated?.description)
  })
})
