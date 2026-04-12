import { test } from '@japa/runner'
import Mission from '#app/modules/missions/domain/entities/mission.entity'
import { FakeMissionRepository } from '#tests/unit/fakes/fake-mission-repository'
import { ListMissionsByDogUseCase } from '#app/modules/missions/application/usecases/list-missions-by-dog.use-case'

test.group('ListMissionsByDogUseCase', (group) => {
  let repo: FakeMissionRepository
  let useCase: ListMissionsByDogUseCase

  group.each.setup(() => {
    repo = new FakeMissionRepository()
    useCase = new ListMissionsByDogUseCase(repo)
  })

  test('should return only missions linked to the requested robot dog', async ({ assert }) => {
    const dogA = '8570f711-2895-4632-9599-281083096058'
    const dogB = '6fe077af-af22-4e3a-bf24-f6b87cb7364d'

    const missionA1 = Mission.create('Inspect sector A', 'user-1')
    const missionA2 = Mission.create('Inspect sector B', 'user-1')
    const missionB1 = Mission.create('Charge station check', 'user-2')

    await repo.save(missionA1)
    await repo.save(missionA2)
    await repo.save(missionB1)

    await repo.assignToDog(missionA1.id.value, dogA)
    await repo.assignToDog(missionA2.id.value, dogA)
    await repo.assignToDog(missionB1.id.value, dogB)

    const result = await useCase.execute(dogA, { page: 1, limit: 10 })

    assert.lengthOf(result.data, 2)
    assert.equal(result.meta.total, 2)
    assert.equal(result.data[0].id.value, missionA1.id.value)
    assert.equal(result.data[1].id.value, missionA2.id.value)
  })

  test('should paginate missions linked to a robot dog', async ({ assert }) => {
    const dogId = '8570f711-2895-4632-9599-281083096058'

    const m1 = Mission.create('Mission 1', 'user-1')
    const m2 = Mission.create('Mission 2', 'user-1')
    const m3 = Mission.create('Mission 3', 'user-1')

    await repo.save(m1)
    await repo.save(m2)
    await repo.save(m3)

    await repo.assignToDog(m1.id.value, dogId)
    await repo.assignToDog(m2.id.value, dogId)
    await repo.assignToDog(m3.id.value, dogId)

    const result = await useCase.execute(dogId, { page: 2, limit: 2 })

    assert.lengthOf(result.data, 1)
    assert.equal(result.meta.total, 3)
    assert.equal(result.meta.currentPage, 2)
    assert.equal(result.meta.lastPage, 2)
    assert.equal(result.data[0].id.value, m3.id.value)
  })

  test('should return empty data when robot dog has no mission', async ({ assert }) => {
    const result = await useCase.execute('8570f711-2895-4632-9599-281083096058', {
      page: 1,
      limit: 10,
    })

    assert.lengthOf(result.data, 0)
    assert.equal(result.meta.total, 0)
  })
})
