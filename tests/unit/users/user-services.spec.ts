import { test } from '@japa/runner'
import { CreateUserUseCase } from '#users/application/usecases/create-user.use-case'
import { DeleteUserUseCase } from '#users/application/usecases/delete-user.use-case'
import { IndexUserUseCase } from '#users/application/usecases/index-user.use-case'
import { ShowUserUseCase } from '#users/application/usecases/show-user.use-case'
import { UpdateUserUseCase } from '#users/application/usecases/update-user.use-case'
import { UserReadRepository } from '#users/domain/contracts/user.read.repository'
import { UserWriteRepository } from '#users/domain/contracts/user.write.repository'
import { UserRole } from '#users/domain/enums/user.role'
import { User } from '#users/domain/user.entity'

class FakeUserReadRepository extends UserReadRepository {
  constructor(private readonly users: User[]) {
    super()
  }

  async findById(id: string): Promise<User | null> {
    return this.users.find((user) => user.id === id) ?? null
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
  test('CreateUserUseCase creates a user with provided profile', async ({ assert }) => {
    const writeRepo = new FakeUserWriteRepository()
    const useCase = new CreateUserUseCase(writeRepo)

    const user = await useCase.execute({
      firstname: 'Jane',
      lastname: 'Doe',
      email: 'jane@example.com',
    })

    assert.equal(user.firstname, 'Jane')
    assert.equal(user.lastname, 'Doe')
    assert.equal(user.email, 'jane@example.com')
    assert.equal(user.role, UserRole.USER)
    assert.lengthOf(writeRepo.created, 1)
  })

  test('IndexUserUseCase returns all users', async ({ assert }) => {
    const users = [User.rehydrate('1', 'a@a.com', 'A', 'A', UserRole.USER)]
    const useCase = new IndexUserUseCase(new FakeUserReadRepository(users))

    const result = await useCase.execute()
    assert.deepEqual(result, users)
  })

  test('ShowUserUseCase returns null when user does not exist', async ({ assert }) => {
    const useCase = new ShowUserUseCase(new FakeUserReadRepository([]))
    const result = await useCase.execute('missing')

    assert.isNull(result)
  })

  test('UpdateUserUseCase merges provided fields', async ({ assert }) => {
    const existing = User.rehydrate('1', 'old@mail.com', 'Old', 'Name', UserRole.USER)
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
    assert.equal(updated!.email, 'old@mail.com')
    assert.equal(updated!.role, UserRole.ADMIN)
    assert.lengthOf(writeRepo.updated, 1)
  })

  test('DeleteUserUseCase returns false when user does not exist', async ({ assert }) => {
    const readRepo = new FakeUserReadRepository([])
    const writeRepo = new FakeUserWriteRepository()
    const useCase = new DeleteUserUseCase(readRepo, writeRepo)

    const deleted = await useCase.execute('missing')

    assert.isFalse(deleted)
    assert.lengthOf(writeRepo.deletedIds, 0)
  })
})
