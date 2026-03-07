import { test } from '@japa/runner'
import { UpdateMissionUseCaseImplementation } from '#app/modules/missions/application/usecases/update-mission.use-case.implementation'
import Mission from '#app/modules/missions/domain/entities/mission.entity'
import { MissionNotFoundError } from '#app/modules/missions/domain/exceptions/invalid-mission-not-fout.error'
import { FakeMissionRepository } from '#tests/unit/fakes/fake-mission-repository'

test.group('UpdateMissionUseCase', (group) => {
  let missionRepo: FakeMissionRepository
  let useCase: UpdateMissionUseCaseImplementation

  group.each.setup(() => {
    missionRepo = new FakeMissionRepository()
    useCase = new UpdateMissionUseCaseImplementation(missionRepo)
  })

  test('should update mission name successfully', async ({ assert }) => {
    const mission = Mission.create('Old Name', 'user-123')
    await missionRepo.save(mission)

    await useCase.execute({
      id: mission.id.value,
      name: 'New Name',
    })

    const updatedMission = await missionRepo.findById(mission.id)
    assert.equal(updatedMission?.name, 'New Name')
  })

  test('should throw MissionNotFoundError when mission does not exist', async ({ assert }) => {
    const nonExistentId = '75d8481d-e069-45d2-8178-59c25605652e'

    await assert.rejects(
      () => useCase.execute({ id: nonExistentId, name: 'Any Name' }),
      MissionNotFoundError
    )
  })

  test('should throw error if id format is invalid', async ({ assert }) => {
    await assert.rejects(() => useCase.execute({ id: 'invalid-uuid', name: 'New Name' }))
  })
})
