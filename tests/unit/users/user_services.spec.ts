import { test } from '@japa/runner'
import { CreateUser } from '#users/application/services/create.user.service'
import { DeleteUser } from '#users/application/services/delete.user.service'
import { IndexUser } from '#users/application/services/index.user.service'
import { ShowUser } from '#users/application/services/show.user.service'
import { UpdateUser } from '#users/application/services/update.user.service'
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

test.group('User services', () => {
  test('CreateUser creates a user with provided profile', async ({ assert }) => {
    const writeRepo = new FakeUserWriteRepository()
    const service = new CreateUser(writeRepo)

    const user = await service.create({
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

  test('IndexUser returns all users', async ({ assert }) => {
    const users = [User.rehydrate('1', 'a@a.com', 'A', 'A', UserRole.USER)]
    const service = new IndexUser(new FakeUserReadRepository(users))

    const result = await service.index()
    assert.deepEqual(result, users)
  })

  test('ShowUser returns null when user does not exist', async ({ assert }) => {
    const service = new ShowUser(new FakeUserReadRepository([]))
    const result = await service.show('missing')

    assert.isNull(result)
  })

  test('UpdateUser merges provided fields', async ({ assert }) => {
    const existing = User.rehydrate('1', 'old@mail.com', 'Old', 'Name', UserRole.USER)
    const readRepo = new FakeUserReadRepository([existing])
    const writeRepo = new FakeUserWriteRepository()
    const service = new UpdateUser(readRepo, writeRepo)

    const updated = await service.update('1', {
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

  test('DeleteUser returns false when user does not exist', async ({ assert }) => {
    const readRepo = new FakeUserReadRepository([])
    const writeRepo = new FakeUserWriteRepository()
    const service = new DeleteUser(readRepo, writeRepo)

    const deleted = await service.delete('missing')

    assert.isFalse(deleted)
    assert.lengthOf(writeRepo.deletedIds, 0)
  })
})
