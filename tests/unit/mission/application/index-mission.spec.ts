import { test } from '@japa/runner'
import { IndexAllMissionsUseCase } from '#app/modules/missions/application/usecases/index-all-missions.use-case'
import { IndexMyMissionsUseCase } from '#app/modules/missions/application/usecases/index-my-missions.use-case'
import Mission from '#app/modules/missions/domain/entities/mission.entity'
import { FakeMissionRepository } from '#tests/unit/fakes/fake-mission-repository'
import { FakeUserGateway } from '#tests/unit/fakes/fake-user-gateway'

test.group('IndexAllMissionsUseCase', (group) => {
  let missionRepo: FakeMissionRepository
  let userGateway: FakeUserGateway
  let useCase: IndexAllMissionsUseCase

  group.each.setup(() => {
    missionRepo = new FakeMissionRepository()
    userGateway = new FakeUserGateway()
    useCase = new IndexAllMissionsUseCase(missionRepo, userGateway)
  })

  test('should return all missions paginated', async ({ assert }) => {
    missionRepo.storedMissions = [
      Mission.create('Mission 1', 'user-1'),
      Mission.create('Mission 2', 'user-1'),
      Mission.create('Mission 3', 'user-2'),
    ]

    const result = await useCase.execute({ page: 1, limit: 2 })

    assert.lengthOf(result.data, 2)
    assert.equal(result.meta.total, 3)
    assert.equal(result.meta.currentPage, 1)
    assert.equal(result.meta.lastPage, 2)
  })

  test('should return empty data if no missions exist', async ({ assert }) => {
    const result = await useCase.execute({ page: 1, limit: 10 })

    assert.lengthOf(result.data, 0)
    assert.equal(result.meta.total, 0)
  })

  test('should filter missions by name when search is provided', async ({ assert }) => {
    missionRepo.storedMissions = [
      Mission.create('Patrouille nord', 'user-1'),
      Mission.create('Inspection sud', 'user-2'),
    ]

    const result = await useCase.execute({ page: 1, limit: 10, search: 'INSPECTION' })

    assert.lengthOf(result.data, 1)
    assert.equal(result.data[0].mission.name, 'Inspection sud')
  })

  test('should handle second page correctly', async ({ assert }) => {
    missionRepo.storedMissions = [
      Mission.create('M1', 'u1'),
      Mission.create('M2', 'u1'),
      Mission.create('M3', 'u1'),
    ]

    const result = await useCase.execute({ page: 2, limit: 2 })

    assert.lengthOf(result.data, 1)
    assert.equal(result.data[0].mission.name, 'M3')
  })

  test('resolves each mission creator via the user gateway, batched by unique user id', async ({
    assert,
  }) => {
    missionRepo.storedMissions = [
      Mission.create('Mission 1', 'user-1'),
      Mission.create('Mission 2', 'user-1'),
      Mission.create('Mission 3', 'user-2'),
    ]
    userGateway.addUser('user-1')
    userGateway.addUser('user-2')

    const result = await useCase.execute({ page: 1, limit: 10 })

    assert.isNotNull(result.data[0].creator)
    assert.isNotNull(result.data[1].creator)
    assert.isNotNull(result.data[2].creator)
  })

  test('creator is null when the user gateway has no match', async ({ assert }) => {
    missionRepo.storedMissions = [Mission.create('Mission 1', 'user-1')]

    const result = await useCase.execute({ page: 1, limit: 10 })

    assert.isNull(result.data[0].creator)
  })
})

test.group('IndexMyMissionsUseCase', (group) => {
  let missionRepo: FakeMissionRepository
  let useCase: IndexMyMissionsUseCase

  group.each.setup(() => {
    missionRepo = new FakeMissionRepository()
    useCase = new IndexMyMissionsUseCase(missionRepo)
  })

  test('should return only missions belonging to the given user', async ({ assert }) => {
    missionRepo.storedMissions = [
      Mission.create('Mission A', 'user-1'),
      Mission.create('Mission B', 'user-1'),
      Mission.create('Mission C', 'user-2'),
    ]

    const result = await useCase.execute('user-1', { page: 1, limit: 10 })

    assert.lengthOf(result.data, 2)
    assert.equal(result.meta.total, 2)
    assert.isTrue(result.data.every((m) => m.userId === 'user-1'))
  })

  test('should return empty data if user has no missions', async ({ assert }) => {
    missionRepo.storedMissions = [Mission.create('Mission A', 'user-2')]

    const result = await useCase.execute('user-1', { page: 1, limit: 10 })

    assert.lengthOf(result.data, 0)
    assert.equal(result.meta.total, 0)
  })

  test('should filter missions by name when search is provided', async ({ assert }) => {
    missionRepo.storedMissions = [
      Mission.create('Patrouille nord', 'user-1'),
      Mission.create('Inspection sud', 'user-1'),
    ]

    const result = await useCase.execute('user-1', { page: 1, limit: 10, search: 'patrouille' })

    assert.lengthOf(result.data, 1)
    assert.equal(result.data[0].name, 'Patrouille nord')
  })

  test('should paginate filtered results correctly', async ({ assert }) => {
    missionRepo.storedMissions = [
      Mission.create('M1', 'user-1'),
      Mission.create('M2', 'user-1'),
      Mission.create('M3', 'user-1'),
      Mission.create('M4', 'user-1'),
      Mission.create('M5', 'user-1'),
      Mission.create('Other', 'user-2'),
    ]

    const page1 = await useCase.execute('user-1', { page: 1, limit: 2 })
    const page2 = await useCase.execute('user-1', { page: 2, limit: 2 })
    const page3 = await useCase.execute('user-1', { page: 3, limit: 2 })

    assert.equal(page1.meta.total, 5)
    assert.equal(page1.meta.lastPage, 3)
    assert.lengthOf(page1.data, 2)

    assert.lengthOf(page2.data, 2)

    assert.lengthOf(page3.data, 1)
    assert.equal(page3.data[0].name, 'M5')
  })
})
