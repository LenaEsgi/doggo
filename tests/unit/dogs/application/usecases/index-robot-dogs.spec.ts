import { test } from '@japa/runner'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake-robot-dog-repository'
import { FakeOwnershipRepository } from '#tests/unit/fakes/fake-ownership-repository'
import { IndexRobotDogsUseCase } from '#dogs/application/usecases/index-robot-dogs.use-case'
import { RobotDog } from '#dogs/domain/robot-dog.entity'

test.group('ListRobotDogsUseCase', (group) => {
  let fakeRepo: FakeRobotDogRepository
  let fakeOwnershipRepository: FakeOwnershipRepository
  let useCase: IndexRobotDogsUseCase

  group.each.setup(() => {
    fakeRepo = new FakeRobotDogRepository()
    fakeOwnershipRepository = new FakeOwnershipRepository()
    useCase = new IndexRobotDogsUseCase(fakeRepo, fakeOwnershipRepository)
  })

  test('should return paginated robot dogs', async ({ assert }) => {
    const dog1 = RobotDog.create('SN-001', 'Rex', 80)
    const dog2 = RobotDog.create('SN-002', 'Bolt', 70)

    await fakeRepo.save(dog1)
    await fakeRepo.save(dog2)

    const result = await useCase.execute({ page: 1, limit: 10 })

    assert.lengthOf(result.data, 2)
    assert.equal(result.data[0].robotDog.serialNumber, 'SN-001')
    assert.equal(result.data[1].robotDog.serialNumber, 'SN-002')
    assert.equal(result.data[0].usersCount, 0)

    assert.equal(result.meta.total, 2)
    assert.equal(result.meta.currentPage, 1)
    assert.equal(result.meta.lastPage, 1)
    assert.equal(result.meta.perPage, 10)
  })

  test('should return empty pagination if no robot dogs', async ({ assert }) => {
    const result = await useCase.execute({ page: 1, limit: 10 })

    assert.lengthOf(result.data, 0)
    assert.equal(result.meta.total, 0)
    assert.equal(result.meta.currentPage, 1)
    assert.equal(result.meta.lastPage, 0)
  })
})
