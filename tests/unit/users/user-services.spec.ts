import { test } from '@japa/runner'
import { OwnershipReadRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.read.repository'
import type { PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'
import type { PaginationDto } from '#app/modules/share/DTO/pagination.dto'
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

class FakeOwnershipReadRepository extends OwnershipReadRepository {
  constructor(private readonly counts: Record<string, number>) {
    super()
  }

  async countActiveDogsByUserIds(userIds: string[]): Promise<Record<string, number>> {
    return userIds.reduce(
      (acc, userId) => {
        acc[userId] = this.counts[userId] ?? 0
        return acc
      },
      {} as Record<string, number>
    )
  }

  async countActiveUsersByRobotDogIds(_robotDogIds: string[]): Promise<Record<string, number>> {
    return {}
  }

  async findActiveDogIdsByUserId(_userId: string): Promise<string[]> {
    return []
  }

  async findActiveUserIdsByRobotDogId(
    _robotDogId: string,
    options?: PaginationDto
  ): Promise<PaginatedResult<string>> {
    const perPage = options?.limit ?? 10
    const currentPage = options?.page ?? 1

    return {
      data: [],
      meta: {
        total: 0,
        perPage,
        currentPage,
        firstPage: 1,
        lastPage: 1,
      },
    }
  }

  async isOwner(_userId: string, _robotDogId: string): Promise<boolean> {
    return false
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
    const useCase = new IndexUserUseCase(
      new FakeUserReadRepository(users),
      new FakeOwnershipReadRepository({ '1': 2 })
    )

    const result = await useCase.execute()
    assert.equal(result[0].user.id, users[0].id)
    assert.equal(result[0].dogsCount, 2)
  })

  test('ShowUserUseCase throws when user does not exist', async ({ assert }) => {
    const useCase = new ShowUserUseCase(
      new FakeUserReadRepository([]),
      new FakeOwnershipReadRepository({})
    )
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
    const ownershipReadRepository = new FakeOwnershipReadRepository({ '1': 3 })
    const useCase = new UpdateUserUseCase(readRepo, writeRepo, ownershipReadRepository)

    const updated = await useCase.execute('1', {
      firstname: 'New',
      role: 'admin',
    })

    assert.isNotNull(updated)
    assert.equal(updated!.user.firstname, 'New')
    assert.equal(updated!.user.lastname, 'Name')
    assert.equal(updated!.user.firebaseUid, 'firebase-uid-1')
    assert.equal(updated!.user.email, 'old@mail.com')
    assert.equal(updated!.user.role, UserRole.ADMIN)
    assert.equal(updated!.dogsCount, 3)
    assert.lengthOf(writeRepo.updated, 1)
  })
})
