import { test } from '@japa/runner'
import { ListRobotDogOwnersUseCase } from '#app/modules/users/ownerships/application/usecases/list-robot-dog-owners.use-case'
import { RobotDogOwnershipGatewayImplementation } from '#app/modules/users/ownerships/infrastructure/gateways/robot-dog-ownership.gateway.implementation'
import { UserOwnershipGatewayImplementation } from '#app/modules/users/ownerships/infrastructure/gateways/user-ownership.gateway.implementation'
import { FakeOwnershipRepository } from '#tests/unit/fakes/fake-ownership-repository'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake-robot-dog-repository'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { RobotDogNotFoundError } from '#dogs/domain/exceptions/robot-dog-not-found.error'
import { UserReadRepository } from '#users/domain/contracts/user.read.repository'
import { User } from '#users/domain/user.entity'
import { UserRole } from '#users/domain/enums/user.role'

class FakeUserReadRepository extends UserReadRepository {
  constructor(private readonly users: User[]) {
    super()
  }

  async findById(id: string): Promise<User | null> {
    return this.users.find((user) => user.id === id) ?? null
  }

  async findByIds(ids: string[]): Promise<User[]> {
    return this.users.filter((user) => ids.includes(user.id))
  }

  async findByFirebaseUid(firebaseUid: string): Promise<User | null> {
    return this.users.find((user) => user.firebaseUid === firebaseUid) ?? null
  }

  async findAll(): Promise<User[]> {
    return this.users
  }
}

test.group('ListRobotDogOwnersUseCase', () => {
  test('returns active owners with their dogs count', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    const owner = User.rehydrate(
      'u1',
      'firebase-u1',
      'john@example.com',
      'John',
      'Doe',
      UserRole.USER
    )
    const userRepository = new FakeUserReadRepository([owner])
    const dogRepository = new FakeRobotDogRepository()
    const ownershipRepository = new FakeOwnershipRepository(
      { [owner.id]: [dog.id.value, 'another-dog'] },
      { [dog.id.value]: [owner.id] }
    )

    await dogRepository.save(dog)

    const useCase = new ListRobotDogOwnersUseCase(
      new RobotDogOwnershipGatewayImplementation(dogRepository),
      new UserOwnershipGatewayImplementation(userRepository),
      ownershipRepository
    )
    const result = await useCase.execute(dog.id.value, { page: 1, limit: 10 })

    assert.lengthOf(result.data, 1)
    assert.equal(result.meta.total, 1)
    assert.equal(result.meta.currentPage, 1)
    assert.equal(result.data[0].user.id, owner.id)
    assert.equal(result.data[0].dogsCount, 2)
  })

  test('throws when robot dog does not exist', async ({ assert }) => {
    const useCase = new ListRobotDogOwnersUseCase(
      new RobotDogOwnershipGatewayImplementation(new FakeRobotDogRepository()),
      new UserOwnershipGatewayImplementation(new FakeUserReadRepository([])),
      new FakeOwnershipRepository()
    )

    await assert.rejects(
      () => useCase.execute('56a39d4d-b05d-42fb-a402-6782fc66dc3d', { page: 1, limit: 10 }),
      RobotDogNotFoundError
    )
  })
})
