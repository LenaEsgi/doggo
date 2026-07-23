import { test } from '@japa/runner'
import { ActionNotFoundError } from '#app/modules/actions/domain/exceptions/action-not-found.error'
import { ActionAlreadyExistsError } from '#app/modules/actions/domain/exceptions/action-already-exists.error'
import { ActionParameterSchemaLockedError } from '#app/modules/actions/domain/exceptions/action-parameter-schema-locked.error'
import Action from '#app/modules/actions/domain/action.entity'
import { FakeActionRepository } from '#tests/unit/fakes/fake-action-repository'
import { FakeMissionStepUsageGateway } from '#tests/unit/fakes/fake-mission-step-usage-gateway'
import { UpdateActionUseCase } from '#app/modules/actions/application/usecases/update-action.use-case'

test.group('Unit | Actions | UpdateActionUseCase', () => {
  test('it should update an existing action', async ({ assert }) => {
    const fakeRepository = new FakeActionRepository()
    const action = Action.create('OLD_CODE', 'Old Name', 'old-slug', 'Old Desc')
    await fakeRepository.save(action)

    const useCase = new UpdateActionUseCase(fakeRepository, new FakeMissionStepUsageGateway())

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

    const useCase = new UpdateActionUseCase(fakeRepository, new FakeMissionStepUsageGateway())

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

    const useCase = new UpdateActionUseCase(fakeRepository, new FakeMissionStepUsageGateway())

    await assert.rejects(
      async () => await useCase.execute({ id: nonExistentId, name: 'New Name' }),
      ActionNotFoundError
    )
  })

  test('it should update description to null when provided', async ({ assert }) => {
    const fakeRepository = new FakeActionRepository()
    const action = Action.create('CODE', 'Name', 'slug', 'Some description')
    await fakeRepository.save(action)

    const useCase = new UpdateActionUseCase(fakeRepository, new FakeMissionStepUsageGateway())

    await useCase.execute({
      id: action.id.value,
      description: null,
    })

    const updated = await fakeRepository.findById(action.id)
    assert.isNull(updated?.description)
  })

  test('it should update the code when the new code is unique', async ({ assert }) => {
    const fakeRepository = new FakeActionRepository()
    const action = Action.create('OLD_CODE', 'Name', 'slug', null)
    await fakeRepository.save(action)

    const useCase = new UpdateActionUseCase(fakeRepository, new FakeMissionStepUsageGateway())

    await useCase.execute({ id: action.id.value, code: 'new_code' })

    const updated = await fakeRepository.findById(action.id)
    assert.equal(updated?.code, 'NEW_CODE')
  })

  test('it should throw ActionAlreadyExistsError when the new code is used by another action', async ({
    assert,
  }) => {
    const fakeRepository = new FakeActionRepository()
    const action = Action.create('CODE_A', 'A', 'a', null)
    const other = Action.create('CODE_B', 'B', 'b', null)
    await fakeRepository.save(action)
    await fakeRepository.save(other)

    const useCase = new UpdateActionUseCase(fakeRepository, new FakeMissionStepUsageGateway())

    await assert.rejects(
      async () => await useCase.execute({ id: action.id.value, code: 'CODE_B' }),
      ActionAlreadyExistsError
    )
  })

  test('it should not throw when the code is updated to its own current value', async ({
    assert,
  }) => {
    const fakeRepository = new FakeActionRepository()
    const action = Action.create('SAME_CODE', 'Name', 'slug', null)
    await fakeRepository.save(action)

    const useCase = new UpdateActionUseCase(fakeRepository, new FakeMissionStepUsageGateway())

    await useCase.execute({ id: action.id.value, code: 'SAME_CODE' })

    const updated = await fakeRepository.findById(action.id)
    assert.equal(updated?.code, 'SAME_CODE')
  })

  test('it should update parameterSchema when the action is not used by any mission step', async ({
    assert,
  }) => {
    const fakeRepository = new FakeActionRepository()
    const action = Action.create('CODE', 'Name', 'slug', null)
    await fakeRepository.save(action)

    const useCase = new UpdateActionUseCase(fakeRepository, new FakeMissionStepUsageGateway())

    await useCase.execute({
      id: action.id.value,
      parameterSchema: { fields: [] },
    })

    const updated = await fakeRepository.findById(action.id)
    assert.deepEqual(updated?.parameterSchema, { fields: [] })
  })

  test('it should throw ActionParameterSchemaLockedError when the action is used by a mission step', async ({
    assert,
  }) => {
    const fakeRepository = new FakeActionRepository()
    const action = Action.create('CODE', 'Name', 'slug', null)
    await fakeRepository.save(action)

    const gateway = new FakeMissionStepUsageGateway()
    gateway.usedActionIds.add(action.id.value)

    const useCase = new UpdateActionUseCase(fakeRepository, gateway)

    await assert.rejects(
      async () =>
        await useCase.execute({
          id: action.id.value,
          parameterSchema: { fields: [] },
        }),
      ActionParameterSchemaLockedError
    )
  })

  test('it should allow updating name even when the action is used, as long as parameterSchema is untouched', async ({
    assert,
  }) => {
    const fakeRepository = new FakeActionRepository()
    const action = Action.create('CODE', 'Old Name', 'slug', null)
    await fakeRepository.save(action)

    const gateway = new FakeMissionStepUsageGateway()
    gateway.usedActionIds.add(action.id.value)

    const useCase = new UpdateActionUseCase(fakeRepository, gateway)

    await useCase.execute({ id: action.id.value, name: 'New Name' })

    const updated = await fakeRepository.findById(action.id)
    assert.equal(updated?.name, 'New Name')
  })

  test('should update minFirmwareVersion', async ({ assert }) => {
    const fakeRepository = new FakeActionRepository()
    const action = Action.create('BARK', 'Aboyer', 'bark', null)
    await fakeRepository.save(action)

    const useCase = new UpdateActionUseCase(fakeRepository, new FakeMissionStepUsageGateway())

    const updated = await useCase.execute({
      id: action.id.value,
      minFirmwareVersion: '2.0.0',
    })

    assert.equal(updated.minFirmwareVersion, '2.0.0')
  })
})
