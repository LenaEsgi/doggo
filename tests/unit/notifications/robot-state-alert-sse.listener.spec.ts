import { test } from '@japa/runner'
import RobotStateAlertSseListener from '#app/modules/notifications/application/listeners/robot-state-alert-sse.listener'
import DogStateChangedEvent from '#dogs/domain/events/dog-state-changed.event'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { NotificationService } from '#app/modules/notifications/application/notification.service'
import {
  NotificationRepository,
  type NotificationRecord,
  type CreateNotificationData,
} from '#app/modules/notifications/domain/contracts/notification.repository'
import { RealtimeBroadcaster } from '#app/modules/notifications/domain/contracts/realtime-broadcaster'
import { NotificationUserGateway } from '#app/modules/notifications/domain/gateways/notification-user.gateway'
import type { UserLocale } from '#users/domain/user.entity'
import type { PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'
import { FakeOwnershipRepository } from '#tests/unit/fakes/fake-ownership-repository'
import { FakeRobotDogOwnershipGateway } from '#tests/unit/fakes/fake-robot-dog-ownership-gateway'

const DOG_ID = 'c3d4e5f6-a7b8-4c9d-0e1f-a2b3c4d5e6f7'

class FakeNotificationRepository extends NotificationRepository {
  readonly created: CreateNotificationData[] = []

  async create(data: CreateNotificationData): Promise<NotificationRecord> {
    this.created.push(data)
    return { ...data, id: 'notif-1', payload: data.payload ?? null, isRead: false, createdAt: '2026-07-21T00:00:00.000Z' }
  }

  async createMany(data: CreateNotificationData[]): Promise<NotificationRecord[]> {
    this.created.push(...data)
    return data.map((d, i) => ({
      ...d,
      id: `notif-${i}`,
      payload: d.payload ?? null,
      isRead: false,
      createdAt: '2026-07-21T00:00:00.000Z',
    }))
  }

  async findByUser(): Promise<PaginatedResult<NotificationRecord>> {
    return { data: [], meta: { total: 0, perPage: 20, currentPage: 1, firstPage: 1, lastPage: 1 } }
  }

  async markAllReadByUser(): Promise<void> {}

  async countBySeverityToday(): Promise<number> {
    return 0
  }
}

class FakeBroadcaster extends RealtimeBroadcaster {
  broadcast(): void {}
}

class FakeNotificationUserGateway extends NotificationUserGateway {
  async findLocaleById(): Promise<UserLocale> {
    return 'fr'
  }

  async findLocalesByIds(userIds: string[]): Promise<Map<string, UserLocale>> {
    return new Map(userIds.map((id) => [id, 'fr']))
  }
}

function buildListener(repo: FakeNotificationRepository) {
  const service = new NotificationService(repo, new FakeBroadcaster(), new FakeNotificationUserGateway())
  const ownershipRepo = new FakeOwnershipRepository({}, { [DOG_ID]: ['owner-a', 'owner-b'] })
  const dogGateway = new FakeRobotDogOwnershipGateway({
    [DOG_ID]: { id: DOG_ID, name: 'Rex' } as never,
  })
  return new RobotStateAlertSseListener(service, ownershipRepo, dogGateway)
}

test.group('RobotStateAlertSseListener', () => {
  test('notifie tous les propriétaires (warning) quand le robot passe hors ligne', async ({
    assert,
  }) => {
    const repo = new FakeNotificationRepository()
    const listener = buildListener(repo)

    await listener.handle(new DogStateChangedEvent(DOG_ID, RobotDogState.OFFLINE))

    assert.lengthOf(repo.created, 2)
    assert.deepEqual(repo.created.map((n) => n.userId).sort(), ['owner-a', 'owner-b'])
    assert.isTrue(repo.created.every((n) => n.type === 'dog.offline'))
    assert.isTrue(repo.created.every((n) => n.severity === 'warning'))
    assert.deepEqual(repo.created[0].payload, { robotDogName: 'Rex' })
  })

  test('notifie tous les propriétaires (critical) quand le robot signale une erreur', async ({
    assert,
  }) => {
    const repo = new FakeNotificationRepository()
    const listener = buildListener(repo)

    await listener.handle(new DogStateChangedEvent(DOG_ID, RobotDogState.ERROR))

    assert.isTrue(repo.created.every((n) => n.type === 'dog.error'))
    assert.isTrue(repo.created.every((n) => n.severity === 'critical'))
  })

  test('ignore les autres transitions (IDLE, IN_MISSION, CHARGING)', async ({ assert }) => {
    const repo = new FakeNotificationRepository()
    const listener = buildListener(repo)

    await listener.handle(new DogStateChangedEvent(DOG_ID, RobotDogState.IDLE))
    await listener.handle(new DogStateChangedEvent(DOG_ID, RobotDogState.IN_MISSION))
    await listener.handle(new DogStateChangedEvent(DOG_ID, RobotDogState.CHARGING))

    assert.lengthOf(repo.created, 0)
  })
})
