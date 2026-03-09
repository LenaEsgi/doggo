import { test } from '@japa/runner'
import { ShowMissionUseCase } from '#app/modules/missions/application/usecases/show-mission.use-case'
import Mission from '#app/modules/missions/domain/entities/mission.entity'
import { FakeMissionRepository } from '#tests/unit/fakes/fake-mission-repository'
import { InvalidMissionNotFountError } from '#app/modules/missions/domain/exceptions/invalid-mission-not-fount.error'

test.group('ShowMissionUseCase', (group) => {
  let missionRepo: FakeMissionRepository
  let useCase: ShowMissionUseCase

  group.each.setup(() => {
    missionRepo = new FakeMissionRepository()
    useCase = new ShowMissionUseCase(missionRepo)
  })

  test('should return a mission by id', async ({ assert }) => {
    const mission = Mission.create('Specific Mission', 'user-123')
    await missionRepo.save(mission)

    const result = await useCase.execute(mission.id.value)

    assert.equal(result.id.value, mission.id.value)
    assert.equal(result.name, 'Specific Mission')
    assert.equal(result.userId, 'user-123')
  })

  test('should throw an error if mission is not found', async ({ assert }) => {
    const unknownId = '550e8400-e29b-41d4-a716-446655440000'

    await assert.rejects(() => useCase.execute(unknownId), InvalidMissionNotFountError)
  })

  test('should throw error if id format is invalid', async ({ assert }) => {
    const invalidId = 'not-a-uuid'

    await assert.rejects(() => useCase.execute(invalidId))
  })
})
