// tests/unit/missions/index_mission_use_case.spec.ts
import { test } from '@japa/runner'
import { IndexMissionUseCaseImplementation } from '#app/modules/missions/application/usecases/index-mission.use-case.implementation'
import Mission from '#app/modules/missions/domain/entities/mission.entity'
import { FakeMissionRepository } from '#tests/unit/fakes/fake_mission_repository'

test.group('IndexMissionUseCase', (group) => {
  let missionRepo: FakeMissionRepository
  let useCase: IndexMissionUseCaseImplementation

  group.each.setup(() => {
    missionRepo = new FakeMissionRepository()
    useCase = new IndexMissionUseCaseImplementation(missionRepo)
  })

  test('should return a paginated list of missions', async ({ assert }) => {
    // Arrange
    missionRepo.storedMissions = [
      Mission.create('Mission 1', 'user-1'),
      Mission.create('Mission 2', 'user-1'),
      Mission.create('Mission 3', 'user-2'),
    ]

    // Act
    const result = await useCase.execute({
      page: 1,
      limit: 2,
    })

    // Assert
    assert.lengthOf(result.data, 2)
    assert.equal(result.meta.total, 3)
    assert.equal(result.meta.currentPage, 1)
    assert.equal(result.meta.lastPage, 2)
    assert.equal(result.data[0].name, 'Mission 1')
  })

  test('should return empty data if no missions exist', async ({ assert }) => {
    // Arrange

    // Act
    const result = await useCase.execute({ page: 1, limit: 10 })

    // Assert
    assert.lengthOf(result.data, 0)
    assert.equal(result.meta.total, 0)
  })

  test('should handle second page correctly', async ({ assert }) => {
    // Arrange
    missionRepo.storedMissions = [
      Mission.create('M1', 'u1'),
      Mission.create('M2', 'u1'),
      Mission.create('M3', 'u1'),
    ]

    // Act
    const result = await useCase.execute({ page: 2, limit: 2 })

    // Assert
    assert.lengthOf(result.data, 1)
    assert.equal(result.data[0].name, 'M3')
  })
})
