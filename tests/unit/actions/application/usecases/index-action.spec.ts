import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { ActionRepository } from '#app/modules/actions/domain/contracts/action.repository'
import Action from '#app/modules/actions/domain/action.entity'
import { FakeActionRepository } from '#tests/unit/fakes/fake-action-repository'
import { IndexActionUseCase } from '#app/modules/actions/application/usecases/index-action.use-case'

test.group('Unit | Actions | IndexActionUseCase', () => {
  test('it should return a paginated list of actions', async ({ assert, cleanup }) => {
    const fakeRepository = new FakeActionRepository()

    await fakeRepository.save(Action.create('A1', 'Action 1', 'a1', null))
    await fakeRepository.save(Action.create('A2', 'Action 2', 'a2', null))
    await fakeRepository.save(Action.create('A3', 'Action 3', 'a3', null))

    app.container.swap(ActionRepository, () => fakeRepository)
    cleanup(() => app.container.restore(ActionRepository))

    const useCase = await app.container.make(IndexActionUseCase)

    const result = await useCase.execute({ page: 1, limit: 2 })

    assert.equal(result.data.length, 2)
    assert.equal(result.meta.total, 3)
    assert.equal(result.meta.currentPage, 1)
    assert.equal(result.meta.lastPage, 2)
    assert.equal(result.data[0].code, 'A1')
    assert.equal(result.data[1].code, 'A2')
  })

  test('it should return the second page of actions', async ({ assert, cleanup }) => {
    const fakeRepository = new FakeActionRepository()

    await fakeRepository.save(Action.create('A1', 'Action 1', 'a1', null))
    await fakeRepository.save(Action.create('A2', 'Action 2', 'a2', null))
    await fakeRepository.save(Action.create('A3', 'Action 3', 'a3', null))

    app.container.swap(ActionRepository, () => fakeRepository)
    cleanup(() => app.container.restore(ActionRepository))

    const useCase = await app.container.make(IndexActionUseCase)

    const result = await useCase.execute({ page: 2, limit: 2 })

    assert.equal(result.data.length, 1)
    assert.equal(result.data[0].code, 'A3')
    assert.equal(result.meta.currentPage, 2)
  })

  test('it should return an empty list when no actions exist', async ({ assert, cleanup }) => {
    const fakeRepository = new FakeActionRepository()

    app.container.swap(ActionRepository, () => fakeRepository)
    cleanup(() => app.container.restore(ActionRepository))

    const useCase = await app.container.make(IndexActionUseCase)

    const result = await useCase.execute({ page: 1, limit: 10 })

    assert.equal(result.data.length, 0)
    assert.equal(result.meta.total, 0)
  })
})
