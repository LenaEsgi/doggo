// tests/unit/users/assign-user-to-robot-dog.usecase.spec.ts
import { test } from '@japa/runner'
import { AssignUserToRobotDogUseCase } from '#app/modules/users/ownerships/application/usecases/assign-user-to-robot-dog.use-case'
import { FakeOwnershipRepository } from '#tests/unit/fakes/fake-ownership-repository'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake-robot-dog-repository'
import { RobotDogOwnershipGatewayImplementation } from '#app/modules/users/ownerships/infrastructure/gateways/robot-dog-ownership.gateway.implementation'
import { UserOwnershipGatewayImplementation } from '#app/modules/users/ownerships/infrastructure/gateways/user-ownership.gateway.implementation'
import { UserReadRepository } from '#users/domain/contracts/user.read.repository'
import { User } from '#users/domain/user.entity'
import { UserRole } from '#users/domain/enums/user.role'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { RobotDogNotFoundError } from '#dogs/domain/exceptions/robot-dog-not-found.error'
import { InvalidUserNotFoundError } from '#users/domain/exceptions/invalid-user-not-found.error'
import { OwnershipAlreadyExistsError } from '#app/modules/users/ownerships/domain/exceptions/ownership-already-exists.error'

class FakeUserReadRepository extends UserReadRepository {
  constructor(private readonly users: User[]) {
    super()
  }
  async findById(id: string): Promise<User | null> {
    return this.users.find((u) => u.id === id) ?? null
  }
  async findByIds(ids: string[]): Promise<User[]> {
    return this.users.filter((u) => ids.includes(u.id))
  }
  async findByFirebaseUid(uid: string): Promise<User | null> {
    return this.users.find((u) => u.firebaseUid === uid) ?? null
  }
  async findAll(): Promise<User[]> {
    return this.users
  }
}

const CALLER_ID = 'caller-00000000-0000-0000-0000-000000000001'
const TARGET_ID = 'target-00000000-0000-0000-0000-000000000002'

test.group('AssignUserToRobotDogUseCase', () => {
  test('creates ownership when caller is owner and target user exists', async ({ assert }) => {
    const caller = User.rehydrate(CALLER_ID, 'fb-caller', 'caller@test.com', 'Caller', 'User', UserRole.USER)
    const target = User.rehydrate(TARGET_ID, 'fb-target', 'target@test.com', 'Target', 'User', UserRole.USER)
    const dog = RobotDog.create('SN-001', 'Rex', 80)

    const dogRepo = new FakeRobotDogRepository()
    await dogRepo.save(dog)

    const ownershipRepo = new FakeOwnershipRepository(
      { [CALLER_ID]: [dog.id.value] },
      { [dog.id.value]: [CALLER_ID] }
    )

    const useCase = new AssignUserToRobotDogUseCase(
      new RobotDogOwnershipGatewayImplementation(dogRepo),
      new UserOwnershipGatewayImplementation(new FakeUserReadRepository([caller, target])),
      ownershipRepo,
      ownershipRepo
    )

    await useCase.execute(dog.id.value, TARGET_ID)

    const isOwner = await ownershipRepo.isOwner(TARGET_ID, dog.id.value)
    assert.isTrue(isOwner)
  })

  test('throws RobotDogNotFoundError when robot dog does not exist', async ({ assert }) => {
    const caller = User.rehydrate(CALLER_ID, 'fb-caller', 'caller@test.com', 'Caller', 'User', UserRole.USER)
    const target = User.rehydrate(TARGET_ID, 'fb-target', 'target@test.com', 'Target', 'User', UserRole.USER)

    const useCase = new AssignUserToRobotDogUseCase(
      new RobotDogOwnershipGatewayImplementation(new FakeRobotDogRepository()),
      new UserOwnershipGatewayImplementation(new FakeUserReadRepository([caller, target])),
      new FakeOwnershipRepository(),
      new FakeOwnershipRepository()
    )

    await assert.rejects(
      () => useCase.execute('non-existent-dog-id', TARGET_ID),
      RobotDogNotFoundError
    )
  })

  test('throws InvalidUserNotFoundError when target user does not exist', async ({ assert }) => {
    const dog = RobotDog.create('SN-002', 'Max', 90)
    const dogRepo = new FakeRobotDogRepository()
    await dogRepo.save(dog)

    const useCase = new AssignUserToRobotDogUseCase(
      new RobotDogOwnershipGatewayImplementation(dogRepo),
      new UserOwnershipGatewayImplementation(new FakeUserReadRepository([])),
      new FakeOwnershipRepository(),
      new FakeOwnershipRepository()
    )

    await assert.rejects(
      () => useCase.execute(dog.id.value, 'non-existent-user-id'),
      InvalidUserNotFoundError
    )
  })

  test('throws OwnershipAlreadyExistsError when target user is already an owner', async ({ assert }) => {
    const target = User.rehydrate(TARGET_ID, 'fb-target', 'target@test.com', 'Target', 'User', UserRole.USER)
    const dog = RobotDog.create('SN-003', 'Bolt', 70)
    const dogRepo = new FakeRobotDogRepository()
    await dogRepo.save(dog)

    const ownershipRepo = new FakeOwnershipRepository(
      { [TARGET_ID]: [dog.id.value] },
      { [dog.id.value]: [TARGET_ID] }
    )

    const useCase = new AssignUserToRobotDogUseCase(
      new RobotDogOwnershipGatewayImplementation(dogRepo),
      new UserOwnershipGatewayImplementation(new FakeUserReadRepository([target])),
      ownershipRepo,
      ownershipRepo
    )

    await assert.rejects(
      () => useCase.execute(dog.id.value, TARGET_ID),
      OwnershipAlreadyExistsError
    )
  })
})
