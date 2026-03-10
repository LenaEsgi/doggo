import { test } from '@japa/runner'
import { IndexUserUseCase } from '#users/application/usecases/index-user.use-case'
import { ShowUserUseCase } from '#users/application/usecases/show-user.use-case'
import { UpdateUserUseCase } from '#users/application/usecases/update-user.use-case'
import { UserReadRepository } from '#users/domain/contracts/user.read.repository'
import { UserWriteRepository } from '#users/domain/contracts/user.write.repository'
import { UserRole } from '#users/domain/enums/user.role'
import { InvalidUserNotFoundError } from '#users/domain/exceptions/invalid-user-not-found.error'
import { User } from '#users/domain/user.entity'

class FakeUserReadRepository extends UserReadRepository {
  constructor(private readonly users: User[]) {
    super()
  }

  async findById(id: string): Promise<User | null> {
    return this.users.find((user) => user.id === id) ?? null
  }

  async findByFirebaseUid(firebaseUid: string): Promise<User | null> {
    return this.users.find((user) => user.firebaseUid === firebaseUid) ?? null
  }

  async findAll(): Promise<User[]> {
    return this.users
  }
}

class FakeUserWriteRepository extends UserWriteRepository {
  public created: User[] = []
  public updated: User[] = []
  public deletedIds: string[] = []

  async create(user: User): Promise<User> {
    this.created.push(user)
    return user
  }

  async update(user: User): Promise<User> {
    this.updated.push(user)
    return user
  }

  async delete(id: string): Promise<void> {
    this.deletedIds.push(id)
  }
}

test.group('User use cases', () => {
  test('IndexUserUseCase returns all users', async ({ assert }) => {
    const users = [User.rehydrate('1', 'firebase-uid-1', 'a@a.com', 'A', 'A', UserRole.USER)]
    const useCase = new IndexUserUseCase(new FakeUserReadRepository(users))

    const result = await useCase.execute()
    assert.deepEqual(result, users)
  })

  test('ShowUserUseCase throws when user does not exist', async ({ assert }) => {
    const useCase = new ShowUserUseCase(new FakeUserReadRepository([]))
    await assert.rejects(() => useCase.execute('missing'), InvalidUserNotFoundError)
  })

  test('UpdateUserUseCase merges provided fields', async ({ assert }) => {
    const existing = User.rehydrate(
      '1',
      'firebase-uid-1',
      'old@mail.com',
      'Old',
      'Name',
      UserRole.USER
    )
    const readRepo = new FakeUserReadRepository([existing])
    const writeRepo = new FakeUserWriteRepository()
    const useCase = new UpdateUserUseCase(readRepo, writeRepo)

    const updated = await useCase.execute('1', {
      firstname: 'New',
      role: 'admin',
    })

    assert.isNotNull(updated)
    assert.equal(updated!.firstname, 'New')
    assert.equal(updated!.lastname, 'Name')
    assert.equal(updated!.firebaseUid, 'firebase-uid-1')
    assert.equal(updated!.email, 'old@mail.com')
    assert.equal(updated!.role, UserRole.ADMIN)
    assert.lengthOf(writeRepo.updated, 1)
  })
})
