import { test } from '@japa/runner'
import { AdoptRobotDogUseCase } from '#app/modules/users/ownerships/application/usecases/adopt-robot-dog.use-case'
import { AbandonRobotDogUseCase } from '#app/modules/users/ownerships/application/usecases/abandon-robot-dog.use-case'
import { ListUserRobotDogsUseCase } from '#app/modules/users/ownerships/application/usecases/list-user-robot-dogs.use-case'
import { FakeOwnershipRepository } from '#tests/unit/fakes/fake-ownership-repository'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake-robot-dog-repository'
import { RobotDogOwnershipGatewayImplementation } from '#app/modules/users/ownerships/infrastructure/gateways/robot-dog-ownership.gateway.implementation'
import { UserOwnershipGatewayImplementation } from '#app/modules/users/ownerships/infrastructure/gateways/user-ownership.gateway.implementation'
import { UserReadRepository } from '#users/domain/contracts/user.read.repository'
import { User } from '#users/domain/user.entity'
import { UserRole } from '#users/domain/enums/user.role'
import { InvalidUserNotFoundError } from '#users/domain/exceptions/invalid-user-not-found.error'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { RobotDogNotFoundError } from '#dogs/domain/exceptions/robot-dog-not-found.error'
import { ActiveOwnershipNotFoundError } from '#app/modules/users/ownerships/domain/exceptions/active-ownership-not-found.error'

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

test.group('User ownership use cases', () => {
  test('AdoptDogUseCase creates an active ownership', async ({ assert }) => {
    const user = User.rehydrate(
      'u1',
      'firebase-u1',
      'john@example.com',
      'John',
      'Doe',
      UserRole.USER
    )
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    const userRepository = new FakeUserReadRepository([user])
    const dogRepository = new FakeRobotDogRepository()
    const ownershipRepository = new FakeOwnershipRepository()

    await dogRepository.save(dog)

    const useCase = new AdoptRobotDogUseCase(
      new UserOwnershipGatewayImplementation(userRepository),
      new RobotDogOwnershipGatewayImplementation(dogRepository),
      ownershipRepository
    )
    await useCase.execute(user.id, dog.serialNumber)

    const { data: dogIds } = await ownershipRepository.findActiveDogIdsByUserId(user.id)
    assert.deepEqual(dogIds, [dog.id.value])
  })

  test('AdoptDogUseCase throws when user does not exist', async ({ assert }) => {
    const dogRepository = new FakeRobotDogRepository()
    const ownershipRepository = new FakeOwnershipRepository()
    const useCase = new AdoptRobotDogUseCase(
      new UserOwnershipGatewayImplementation(new FakeUserReadRepository([])),
      new RobotDogOwnershipGatewayImplementation(dogRepository),
      ownershipRepository
    )

    await assert.rejects(
      () =>
        useCase.execute(
          '7b27cc5b-e591-48f2-85ba-f29f96eb9971',
          '56a39d4d-b05d-42fb-a402-6782fc66dc3d'
        ),
      InvalidUserNotFoundError
    )
  })

  test('AbandonDogUseCase closes an active ownership', async ({ assert }) => {
    const user = User.rehydrate(
      'u1',
      'firebase-u1',
      'john@example.com',
      'John',
      'Doe',
      UserRole.USER
    )
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    const userRepository = new FakeUserReadRepository([user])
    const dogRepository = new FakeRobotDogRepository()
    const ownershipRepository = new FakeOwnershipRepository(
      { [user.id]: [dog.id.value] },
      { [dog.id.value]: [user.id] }
    )

    await dogRepository.save(dog)

    const useCase = new AbandonRobotDogUseCase(
      new UserOwnershipGatewayImplementation(userRepository),
      new RobotDogOwnershipGatewayImplementation(dogRepository),
      ownershipRepository
    )
    await useCase.execute(user.id, dog.id.value)

    const { data: dogIds } = await ownershipRepository.findActiveDogIdsByUserId(user.id)
    assert.deepEqual(dogIds, [])
  })

  test('AbandonDogUseCase throws when ownership does not exist', async ({ assert }) => {
    const user = User.rehydrate(
      'u1',
      'firebase-u1',
      'john@example.com',
      'John',
      'Doe',
      UserRole.USER
    )
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    const userRepository = new FakeUserReadRepository([user])
    const dogRepository = new FakeRobotDogRepository()
    const ownershipRepository = new FakeOwnershipRepository()

    await dogRepository.save(dog)

    const useCase = new AbandonRobotDogUseCase(
      new UserOwnershipGatewayImplementation(userRepository),
      new RobotDogOwnershipGatewayImplementation(dogRepository),
      ownershipRepository
    )

    await assert.rejects(() => useCase.execute(user.id, dog.id.value), ActiveOwnershipNotFoundError)
  })

  test('ListUserDogsUseCase returns active dogs with owners count', async ({ assert }) => {
    const user = User.rehydrate(
      'u1',
      'firebase-u1',
      'john@example.com',
      'John',
      'Doe',
      UserRole.USER
    )
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    const userRepository = new FakeUserReadRepository([user])
    const dogRepository = new FakeRobotDogRepository()
    const ownershipRepository = new FakeOwnershipRepository(
      { [user.id]: [dog.id.value] },
      { [dog.id.value]: [user.id, 'u2'] }
    )

    await dogRepository.save(dog)

    const useCase = new ListUserRobotDogsUseCase(
      new UserOwnershipGatewayImplementation(userRepository),
      new RobotDogOwnershipGatewayImplementation(dogRepository),
      ownershipRepository
    )
    const result = await useCase.execute(user.id)

    assert.lengthOf(result.data, 1)
    assert.equal(result.data[0].robotDog.id.value, dog.id.value)
    assert.equal(result.data[0].usersCount, 2)
  })

  test('ListUserDogsUseCase throws when dog does not exist', async ({ assert }) => {
    const user = User.rehydrate(
      'u1',
      'firebase-u1',
      'john@example.com',
      'John',
      'Doe',
      UserRole.USER
    )
    const useCase = new ListUserRobotDogsUseCase(
      new UserOwnershipGatewayImplementation(new FakeUserReadRepository([user])),
      new RobotDogOwnershipGatewayImplementation(new FakeRobotDogRepository()),
      new FakeOwnershipRepository({ [user.id]: ['missing-dog-id'] })
    )

    const result = await useCase.execute(user.id)
    assert.lengthOf(result.data, 0)
  })

  test('AdoptDogUseCase throws when dog does not exist', async ({ assert }) => {
    const user = User.rehydrate(
      'u1',
      'firebase-u1',
      'john@example.com',
      'John',
      'Doe',
      UserRole.USER
    )
    const useCase = new AdoptRobotDogUseCase(
      new UserOwnershipGatewayImplementation(new FakeUserReadRepository([user])),
      new RobotDogOwnershipGatewayImplementation(new FakeRobotDogRepository()),
      new FakeOwnershipRepository()
    )

    await assert.rejects(
      () => useCase.execute(user.id, '56a39d4d-b05d-42fb-a402-6782fc66dc3d'),
      RobotDogNotFoundError
    )
  })
})
