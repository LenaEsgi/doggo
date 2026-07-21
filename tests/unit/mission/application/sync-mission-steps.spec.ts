import { test } from '@japa/runner'
import { SyncMissionStepsUseCase } from '#app/modules/missions/application/usecases/sync-mission-steps.use-case'
import Mission from '#app/modules/missions/domain/entities/mission.entity'
import Action from '#app/modules/actions/domain/action.entity'
import { MissionNotFoundError } from '#app/modules/missions/domain/exceptions/mission-not-found.error'
import { ActionNotFoundError } from '#app/modules/actions/domain/exceptions/action-not-found.error'
import { InvalidActionParametersError } from '#app/modules/actions/domain/exceptions/invalid-action-parameters.error'
import { FakeMissionRepository } from '#tests/unit/fakes/fake-mission-repository'
import { FakeActionRepository } from '#tests/unit/fakes/fake-action-repository'
import { FakeMissionRunRepository } from '#tests/unit/fakes/fake-mission-run-repository'
import MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { InvalidMissionNotEditableError } from '#app/modules/missions/domain/exceptions/invalid-mission-not-editable.error'
import type { ActionParameterSchema } from '#app/modules/actions/domain/value-objects/action-parameter-schema'
import { ActionNotAvailableError } from '#app/modules/actions/domain/exceptions/action-not-available.error'

// Schema de test : action MOVE avec distance_cm requis (1-5000)
const moveSchema: ActionParameterSchema = {
  fields: [
    {
      name: 'distance_cm',
      label: 'Distance',
      type: 'number',
      required: true,
      unit: 'cm',
      min: 1,
      max: 5000,
    },
  ],
}

function makeAction(
  id: string,
  schema: ActionParameterSchema | null = null,
  isActive = true
): Action {
  return Action.rehydrate(id, 'MOVE', 'Move', 'move', null, schema, isActive)
}

test.group('SyncMissionStepsUseCase', () => {
  test('synce les steps et sauvegarde la mission', async ({ assert }) => {
    // --- ARRANGE ---
    const missionRepo = new FakeMissionRepository()
    const actionRepo = new FakeActionRepository()
    const useCase = new SyncMissionStepsUseCase(
      missionRepo,
      new FakeMissionRunRepository(),
      actionRepo
    )

    const actionId = '550e8400-e29b-41d4-a716-446655440001'
    actionRepo.actions.push(makeAction(actionId, null)) // pas de schema → tout accepté

    const mission = Mission.create('Mission Test', 'user-001')
    mission.addStep(actionId, '{}')
    mission.addStep(actionId, '{}')
    await missionRepo.save(mission)

    const [step1, step2] = mission.missionSteps

    // --- ACT ---
    const result = await useCase.execute({
      missionId: mission.id.value,
      steps: [
        { id: step2.id.value, actionId, parameters: '{}' },
        { id: step1.id.value, actionId, parameters: '{}' },
        { actionId, parameters: '{}' },
      ],
    })

    // --- ASSERT ---
    const saved = await missionRepo.findById(mission.id)
    assert.isNotNull(saved)
    assert.lengthOf(saved!.missionSteps, 3)

    const ordered = saved!.getStepsInOrder()
    assert.equal(ordered[0].id.value, step2.id.value)
    assert.equal(ordered[0].order, 1)
    assert.equal(ordered[1].id.value, step1.id.value)
    assert.equal(ordered[1].order, 2)
    assert.equal(ordered[2].order, 3)

    assert.equal(result.id.value, mission.id.value)
  })

  test("lance MissionNotFoundError si la mission n'existe pas", async ({ assert }) => {
    const missionRepo = new FakeMissionRepository()
    const actionRepo = new FakeActionRepository()
    const useCase = new SyncMissionStepsUseCase(
      missionRepo,
      new FakeMissionRunRepository(),
      actionRepo
    )

    const unknownId = '550e8400-e29b-41d4-a716-446655440000'

    await assert.rejects(
      async () => useCase.execute({ missionId: unknownId, steps: [] }),
      MissionNotFoundError
    )
  })

  test('lance ActionNotFoundError si une action du step est inconnue', async ({ assert }) => {
    const missionRepo = new FakeMissionRepository()
    const actionRepo = new FakeActionRepository() // vide
    const useCase = new SyncMissionStepsUseCase(
      missionRepo,
      new FakeMissionRunRepository(),
      actionRepo
    )

    const mission = Mission.create('Mission Test', 'user-001')
    await missionRepo.save(mission)

    const unknownActionId = '550e8400-e29b-41d4-a716-446655440099'

    await assert.rejects(
      async () =>
        useCase.execute({
          missionId: mission.id.value,
          steps: [{ actionId: unknownActionId, parameters: '{}' }],
        }),
      ActionNotFoundError
    )
  })

  test('lance InvalidActionParametersError si les paramètres ne respectent pas le schema', async ({
    assert,
  }) => {
    const missionRepo = new FakeMissionRepository()
    const actionRepo = new FakeActionRepository()
    const useCase = new SyncMissionStepsUseCase(
      missionRepo,
      new FakeMissionRunRepository(),
      actionRepo
    )

    const actionId = '550e8400-e29b-41d4-a716-446655440002'
    actionRepo.actions.push(makeAction(actionId, moveSchema))

    const mission = Mission.create('Mission Test', 'user-001')
    await missionRepo.save(mission)

    // distance_cm manquant → doit throw
    await assert.rejects(
      async () =>
        useCase.execute({
          missionId: mission.id.value,
          steps: [{ actionId, parameters: '{}' }],
        }),
      InvalidActionParametersError
    )
  })

  test('accepte les paramètres valides respectant le schema', async ({ assert }) => {
    const missionRepo = new FakeMissionRepository()
    const actionRepo = new FakeActionRepository()
    const useCase = new SyncMissionStepsUseCase(
      missionRepo,
      new FakeMissionRunRepository(),
      actionRepo
    )

    const actionId = '550e8400-e29b-41d4-a716-446655440003'
    actionRepo.actions.push(makeAction(actionId, moveSchema))

    const mission = Mission.create('Mission Test', 'user-001')
    await missionRepo.save(mission)

    const result = await useCase.execute({
      missionId: mission.id.value,
      steps: [{ actionId, parameters: '{"distance_cm": 200}' }],
    })

    assert.lengthOf(result.missionSteps, 1)
  })

  test('doit refuser si une mission a un run actif', async ({ assert }) => {
    const missionRepo = new FakeMissionRepository()
    const actionRepo = new FakeActionRepository()
    const runRepo = new FakeMissionRunRepository()
    const useCase = new SyncMissionStepsUseCase(missionRepo, runRepo, actionRepo)

    const actionId = '550e8400-e29b-41d4-a716-446655440004'
    actionRepo.actions.push(makeAction(actionId, null))

    const mission = Mission.create('Mission Test', 'user-001')
    await missionRepo.save(mission)
    await runRepo.save(MissionRun.start(mission.id, RobotDogId.generate(), []))

    await assert.rejects(
      () =>
        useCase.execute({
          missionId: mission.id.value,
          steps: [{ actionId, parameters: '{}' }],
        }),
      InvalidMissionNotEditableError
    )
  })

  test('lance ActionNotAvailableError si un nouveau step référence une action désactivée', async ({
    assert,
  }) => {
    const missionRepo = new FakeMissionRepository()
    const actionRepo = new FakeActionRepository()
    const useCase = new SyncMissionStepsUseCase(
      missionRepo,
      new FakeMissionRunRepository(),
      actionRepo
    )

    const actionId = '550e8400-e29b-41d4-a716-446655440005'
    actionRepo.actions.push(makeAction(actionId, null, false))

    const mission = Mission.create('Mission Test', 'user-001')
    await missionRepo.save(mission)

    await assert.rejects(
      async () =>
        useCase.execute({
          missionId: mission.id.value,
          steps: [{ actionId, parameters: '{}' }],
        }),
      ActionNotAvailableError
    )
  })

  test('autorise à conserver un step existant même si son action a été désactivée depuis', async ({
    assert,
  }) => {
    const missionRepo = new FakeMissionRepository()
    const actionRepo = new FakeActionRepository()
    const useCase = new SyncMissionStepsUseCase(
      missionRepo,
      new FakeMissionRunRepository(),
      actionRepo
    )

    const actionId = '550e8400-e29b-41d4-a716-446655440006'
    actionRepo.actions.push(makeAction(actionId, null))

    const mission = Mission.create('Mission Test', 'user-001')
    mission.addStep(actionId, '{}')
    await missionRepo.save(mission)
    const [existingStep] = mission.missionSteps

    // L'action est désactivée après coup, une fois déjà utilisée par ce step
    actionRepo.actions[0] = Action.rehydrate(actionId, 'MOVE', 'Move', 'move', null, null, false)

    const result = await useCase.execute({
      missionId: mission.id.value,
      steps: [{ id: existingStep.id.value, actionId, parameters: '{}' }],
    })

    assert.lengthOf(result.missionSteps, 1)
  })
})
