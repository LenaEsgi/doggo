import { test } from '@japa/runner'
import { NotificationService } from '#app/modules/notifications/application/notification.service'
import {
  NotificationRepository,
  type NotificationRecord,
  type CreateNotificationData,
  type FindNotificationsParams,
} from '#app/modules/notifications/domain/contracts/notification.repository'
import type { PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'

const FAKE_RECORD: NotificationRecord = {
  id: 'notif-1',
  userId: 'user-1',
  type: 'dog.assigned',
  severity: 'info',
  payload: { robotDogName: 'Rex' },
  robotDogId: 'dog-1',
  isRead: false,
  createdAt: '2026-06-22T10:00:00.000Z',
}

class FakeNotificationRepository extends NotificationRepository {
  readonly created: CreateNotificationData[] = []

  async create(data: CreateNotificationData): Promise<NotificationRecord> {
    this.created.push(data)
    return {
      ...FAKE_RECORD,
      ...data,
      id: 'notif-1',
      isRead: false,
      createdAt: '2026-06-22T10:00:00.000Z',
    }
  }

  async findByUser(
    _userId: string,
    _params: FindNotificationsParams
  ): Promise<PaginatedResult<NotificationRecord>> {
    return { data: [], meta: { total: 0, perPage: 20, currentPage: 1, firstPage: 1, lastPage: 1 } }
  }

  async markAllReadByUser(_userId: string): Promise<void> {}
}

test.group('NotificationService', () => {
  test('crée une notification avec payload et robotDogId', async ({ assert }) => {
    const repo = new FakeNotificationRepository()
    const service = new NotificationService(repo)

    await service.create('user-1', 'dog.assigned', 'info', { robotDogName: 'Rex' }, 'dog-1')

    assert.lengthOf(repo.created, 1)
    assert.equal(repo.created[0].userId, 'user-1')
    assert.equal(repo.created[0].type, 'dog.assigned')
    assert.equal(repo.created[0].severity, 'info')
    assert.deepEqual(repo.created[0].payload, { robotDogName: 'Rex' })
    assert.equal(repo.created[0].robotDogId, 'dog-1')
  })

  test('crée une notification sans payload ni robotDogId', async ({ assert }) => {
    const repo = new FakeNotificationRepository()
    const service = new NotificationService(repo)

    await service.create('user-1', 'dog.revoked', 'warning')

    assert.lengthOf(repo.created, 1)
    assert.equal(repo.created[0].severity, 'warning')
    assert.isNull(repo.created[0].payload)
    assert.isNull(repo.created[0].robotDogId)
  })

  test('ne plante pas si le broadcast SSE echoue', async ({ assert }) => {
    const repo = new FakeNotificationRepository()
    const service = new NotificationService(repo)

    await assert.doesNotReject(() =>
      service.create('user-1', 'dog.assigned', 'info', { robotDogName: 'Rex' }, 'dog-1')
    )
  })
})
