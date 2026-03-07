// tests/unit/missions/destroy_mission_use_case.spec.ts
import { test } from '@japa/runner'
import { DestroyMissionUseCaseImplementation } from '#app/modules/missions/application/usecases/destroy-mission.use-case.implementation'
import Mission from '#app/modules/missions/domain/entities/mission.entity'
import { MissionNotFoundError } from '#app/modules/missions/domain/exceptions/invalid-mission-not-fout.error'
import { FakeMissionRepository } from '#tests/unit/fakes/fake_mission_repository'

test.group('DestroyMissionUseCase', (group) => {
  let missionRepo: FakeMissionRepository
  let useCase: DestroyMissionUseCaseImplementation

  group.each.setup(() => {
    missionRepo = new FakeMissionRepository()
    useCase = new DestroyMissionUseCaseImplementation(missionRepo)
  })

  test('should delete a mission successfully', async ({ assert }) => {
    // Arrange
    const mission = Mission.create('Mission to Destroy', 'user-123')
    await missionRepo.save(mission)

    const missionIdString = mission.id.value
    assert.lengthOf(missionRepo.storedMissions, 1)

    // Act
    await useCase.execute({ id: missionIdString })

    // Assert
    assert.lengthOf(missionRepo.storedMissions, 0)
    const found = await missionRepo.findById(mission.id)
    assert.isNull(found)
  })

  test('should throw MissionNotFoundError when mission does not exist', async ({ assert }) => {
    // Arrange
    const nonExistentId = '75d8481d-e069-45d2-8178-59c25605652e'

    // Act & Assert
    await assert.rejects(
      () => useCase.execute({ id: nonExistentId }),
      MissionNotFoundError
    )
  })

  test('should throw error if ID format is invalid', async ({ assert }) => {
    // Arrange
    const invalidId = 'not-a-uuid'

    // Act & Assert
    await assert.rejects(
      () => useCase.execute({ id: invalidId })
    )
  })
})
