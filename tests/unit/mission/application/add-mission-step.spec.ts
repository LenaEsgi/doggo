import { test } from '@japa/runner'
import { AddMissionStepUseCase } from '#app/modules/missions/application/usecases/add-mission-step.use-case'
import Mission from '#app/modules/missions/domain/entities/mission.entity'
import { MissionNotFoundError } from '#app/modules/missions/domain/exceptions/mission-not-found.error'
import { FakeMissionRepository } from '#tests/unit/fakes/fake-mission-repository'
import { FakeMissionRunRepository } from '#tests/unit/fakes/fake-mission-run-repository'
import { FakeActionRepository } from '#tests/unit/fakes/fake-action-repository'
import MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'
import Action from '#app/modules/actions/domain/action.entity'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { InvalidMissionNotEditableError } from '#app/modules/missions/domain/exceptions/invalid-mission-not-editable.error'
import { ActionNotFoundError } from '#app/modules/actions/domain/exceptions/action-not-found.error'
import { ActionNotAvailableError } from '#app/modules/actions/domain/exceptions/action-not-available.error'

function makeAction(id: string, isActive = true): Action {
  return Action.rehydrate(id, 'MOVE_TO', 'Move to', 'move-to', null, null, isActive)
}

test.group('AddMissionStepUseCase', () => {
  test('doit ajouter une étape à une mission existante dans le repository', async ({ assert }) => {
    const repo = new FakeMissionRepository()
    const actionRepo = new FakeActionRepository()
    const useCase = new AddMissionStepUseCase(repo, new FakeMissionRunRepository(), actionRepo)

    const mission = Mission.create('Mission Patrouille', 'user-001')
    await repo.save(mission)

    const actionId = '550e8400-e29b-41d4-a716-446655440101'
    actionRepo.actions.push(makeAction(actionId))

    const dto = {
      missionId: mission.id.value,
      actionId,
      parameters: 'test',
    }

    await useCase.execute(dto)

    const updatedMission = await repo.findById(mission.id)

    assert.isNotNull(updatedMission)
    assert.lengthOf(updatedMission!.missionSteps, 1)
    assert.equal(updatedMission!.missionSteps[0].actionId, actionId)
    assert.deepEqual(updatedMission!.missionSteps[0].parameters, 'test')
  })

  test("doit échouer si la mission n'existe pas dans le fake repository", async ({ assert }) => {
    const repo = new FakeMissionRepository()
    const actionRepo = new FakeActionRepository()
    const useCase = new AddMissionStepUseCase(repo, new FakeMissionRunRepository(), actionRepo)

    const validButUnknownUuid = '550e8400-e29b-41d4-a716-446655440000'
    const actionId = '550e8400-e29b-41d4-a716-446655440102'
    actionRepo.actions.push(makeAction(actionId))

    const dto = {
      missionId: validButUnknownUuid,
      actionId,
      parameters: '',
    }

    await assert.rejects(async () => {
      await useCase.execute(dto)
    }, MissionNotFoundError)
  })

  test("doit échouer si l'action n'existe pas", async ({ assert }) => {
    const repo = new FakeMissionRepository()
    const actionRepo = new FakeActionRepository()
    const useCase = new AddMissionStepUseCase(repo, new FakeMissionRunRepository(), actionRepo)

    const mission = Mission.create('Mission Patrouille', 'user-001')
    await repo.save(mission)

    const unknownActionId = '550e8400-e29b-41d4-a716-446655440103'

    await assert.rejects(
      () =>
        useCase.execute({
          missionId: mission.id.value,
          actionId: unknownActionId,
          parameters: '',
        }),
      ActionNotFoundError
    )
  })

  test('doit refuser une action désactivée', async ({ assert }) => {
    const repo = new FakeMissionRepository()
    const actionRepo = new FakeActionRepository()
    const useCase = new AddMissionStepUseCase(repo, new FakeMissionRunRepository(), actionRepo)

    const mission = Mission.create('Mission Patrouille', 'user-001')
    await repo.save(mission)

    const actionId = '550e8400-e29b-41d4-a716-446655440104'
    actionRepo.actions.push(makeAction(actionId, false))

    await assert.rejects(
      () => useCase.execute({ missionId: mission.id.value, actionId, parameters: '' }),
      ActionNotAvailableError
    )
  })

  test('doit refuser si une mission a un run actif', async ({ assert }) => {
    const repo = new FakeMissionRepository()
    const runRepo = new FakeMissionRunRepository()
    const actionRepo = new FakeActionRepository()
    const useCase = new AddMissionStepUseCase(repo, runRepo, actionRepo)

    const mission = Mission.create('Mission Patrouille', 'user-001')
    await repo.save(mission)
    await runRepo.save(MissionRun.start(mission.id, RobotDogId.generate(), []))

    const actionId = '550e8400-e29b-41d4-a716-446655440105'
    actionRepo.actions.push(makeAction(actionId))

    await assert.rejects(
      () => useCase.execute({ missionId: mission.id.value, actionId, parameters: 'test' }),
      InvalidMissionNotEditableError
    )
  })
})
