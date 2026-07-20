import { test } from '@japa/runner'
import { AddMissionStepUseCase } from '#app/modules/missions/application/usecases/add-mission-step.use-case'
import Mission from '#app/modules/missions/domain/entities/mission.entity'
import { MissionNotFoundError } from '#app/modules/missions/domain/exceptions/mission-not-found.error'
import { FakeMissionRepository } from '#tests/unit/fakes/fake-mission-repository'
import { FakeMissionRunRepository } from '#tests/unit/fakes/fake-mission-run-repository'
import MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { InvalidMissionNotEditableError } from '#app/modules/missions/domain/exceptions/invalid-mission-not-editable.error'

test.group('AddMissionStepUseCase', () => {
  test('doit ajouter une étape à une mission existante dans le repository', async ({ assert }) => {
    // --- ARRANGE ---
    const repo = new FakeMissionRepository()
    const useCase = new AddMissionStepUseCase(repo, new FakeMissionRunRepository())

    const mission = Mission.create('Mission Patrouille', 'user-001')
    await repo.save(mission)

    const dto = {
      missionId: mission.id.value,
      actionId: 'move_to',
      parameters: 'test',
    }

    // --- ACT ---
    await useCase.execute(dto)

    // --- ASSERT ---
    const updatedMission = await repo.findById(mission.id)

    assert.isNotNull(updatedMission)
    assert.lengthOf(updatedMission!.missionSteps, 1)
    assert.equal(updatedMission!.missionSteps[0].actionId, 'move_to')
    assert.deepEqual(updatedMission!.missionSteps[0].parameters, 'test')
  })

  test("doit échouer si la mission n'existe pas dans le fake repository", async ({ assert }) => {
    const repo = new FakeMissionRepository()
    const useCase = new AddMissionStepUseCase(repo, new FakeMissionRunRepository())

    const validButUnknownUuid = '550e8400-e29b-41d4-a716-446655440000'

    const dto = {
      missionId: validButUnknownUuid,
      actionId: 'take_photo',
      parameters: '',
    }

    await assert.rejects(async () => {
      await useCase.execute(dto)
    }, MissionNotFoundError)
  })

  test('doit refuser si une mission a un run actif', async ({ assert }) => {
    const repo = new FakeMissionRepository()
    const runRepo = new FakeMissionRunRepository()
    const useCase = new AddMissionStepUseCase(repo, runRepo)

    const mission = Mission.create('Mission Patrouille', 'user-001')
    await repo.save(mission)
    await runRepo.save(MissionRun.start(mission.id, RobotDogId.generate(), []))

    await assert.rejects(
      () =>
        useCase.execute({ missionId: mission.id.value, actionId: 'move_to', parameters: 'test' }),
      InvalidMissionNotEditableError
    )
  })
})
