import { test } from '@japa/runner'
import { CreateMissionUseCase } from '#app/modules/missions/application/usecases/create-mission.use-case'
import { FakeMissionRepository } from '#tests/unit/fakes/fake-mission-repository'
import { CreateMissionDto } from '#app/modules/missions/application/dto/create-mission.dto'

test.group('CreateMissionUseCase', (group) => {
  let missionRepo: FakeMissionRepository
  let useCase: CreateMissionUseCase

  group.each.setup(() => {
    missionRepo = new FakeMissionRepository()
    useCase = new CreateMissionUseCase(missionRepo)
  })

  test('should create and save a mission', async ({ assert }) => {
    const userId = 'user-123'
    const missionName = 'Inspect Sector A'

    await useCase.execute(new CreateMissionDto(missionName, userId))

    assert.lengthOf(missionRepo.storedMissions, 1)
    assert.equal(missionRepo.storedMissions[0].name, missionName)
    assert.equal(missionRepo.storedMissions[0].userId, userId)
  })

  test('should create mission without any robot dog association', async ({ assert }) => {
    await useCase.execute(new CreateMissionDto('Patrol Route B', 'user-456'))

    assert.lengthOf(missionRepo.storedMissions[0].robotDogIds, 0)
  })

  test('should return the created mission id', async ({ assert }) => {
    const result = await useCase.execute(new CreateMissionDto('Alpha Route', 'user-123'))

    assert.isString(result.id)
    assert.isTrue(result.id.length > 0)
  })
})
