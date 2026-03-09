import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { ActionRepository } from '#app/modules/actions/domain/contracts/action.repository'
import { ActionAlreadyExistsError } from '#app/modules/actions/domain/exceptions/action-already-exists.error'
import Action from '#app/modules/actions/domain/action.entity'
import { FakeActionRepository } from '#tests/unit/fakes/fake-action-repository'
import { CreateActionUseCase } from '#app/modules/actions/application/usecases/create-action.use-case'

test.group('Unit | Actions | CreateActionUseCase', () => {
  test('it should create and save an action when code is unique', async ({ assert, cleanup }) => {
    const fakeRepository = new FakeActionRepository()

    app.container.swap(ActionRepository, () => fakeRepository)

    cleanup(() => app.container.restore(ActionRepository))

    const useCase = await app.container.make(CreateActionUseCase)

    const dto = {
      code: 'NEW_ACT',
      name: 'New Action',
      slug: 'new-action',
      description: 'Description',
    }

    await useCase.execute(dto)

    assert.equal(fakeRepository.actions.length, 1)
    assert.equal(fakeRepository.actions[0].code, 'NEW_ACT')
  })

  test('it should throw ActionAlreadyExistsError when code already exists', async ({
    assert,
    cleanup,
  }) => {
    const fakeRepository = new FakeActionRepository()

    fakeRepository.actions.push(Action.create('EXISTING', 'Name', 'slug', null))

    app.container.swap(ActionRepository, () => fakeRepository)
    cleanup(() => app.container.restore(ActionRepository))

    const useCase = await app.container.make(CreateActionUseCase)

    await assert.rejects(async () => {
      await useCase.execute({
        code: 'EXISTING',
        name: 'Other',
        slug: 'other',
        description: null,
      })
    }, ActionAlreadyExistsError)

    assert.equal(fakeRepository.actions.length, 1)
  })
})
