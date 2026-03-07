import { test } from '@japa/runner'
import { AddMissionStepUseCaseImplementation } from '#app/modules/missions/application/usecases/add-mission-step.use-case.implementation'
import Mission from '#app/modules/missions/domain/entities/mission.entity'
import { MissionNotFoundError } from '#app/modules/missions/domain/exceptions/invalid-mission-not-fout.error'
import { FakeMissionRepository } from '#tests/unit/fakes/fake_mission_repository'

test.group('AddMissionStepUseCase', () => {

  test('doit ajouter une étape à une mission existante dans le repository', async ({ assert }) => {
    // --- ARRANGE ---
    const repo = new FakeMissionRepository()
    const useCase = new AddMissionStepUseCaseImplementation(repo)

    const mission = Mission.create('Mission Patrouille', 'user-001')
    await repo.save(mission)

    const dto = {
      missionId: mission.id.value,
      actionId: 'move_to',
      parameters: "test"
    }

    // --- ACT ---
    await useCase.execute(dto)

    // --- ASSERT ---
    const updatedMission = await repo.findById(mission.id)

    assert.isNotNull(updatedMission)
    assert.lengthOf(updatedMission!.missionSteps, 1)
    assert.equal(updatedMission!.missionSteps[0].actionId, 'move_to')
    assert.deepEqual(updatedMission!.missionSteps[0].parameters, "test")
  })

  test('doit échouer si la mission n\'existe pas dans le fake repository', async ({ assert }) => {
    const repo = new FakeMissionRepository()
    const useCase = new AddMissionStepUseCaseImplementation(repo)

    const validButUnknownUuid = '550e8400-e29b-41d4-a716-446655440000'

    const dto = {
      missionId: validButUnknownUuid,
      actionId: 'take_photo',
      parameters: ""
    }

    await assert.rejects(async () => {
      await useCase.execute(dto)
    }, MissionNotFoundError)
  })
})
