import { test } from '@japa/runner'
import { NotificationService } from '#app/modules/notifications/application/notification.service'
import { RealtimeBroadcaster } from '#app/modules/notifications/domain/contracts/realtime-broadcaster'
import { NotificationUserGateway } from '#app/modules/notifications/domain/gateways/notification-user.gateway'
import {
  NotificationRepository,
  type NotificationRecord,
  type CreateNotificationData,
  type FindNotificationsParams,
} from '#app/modules/notifications/domain/contracts/notification.repository'
import type { UserLocale } from '#users/domain/user.entity'
import type { PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'
import { FakeOwnershipRepository } from '#tests/unit/fakes/fake-ownership-repository'
import MissionStartFailedEvent from '#app/modules/missions/domain/events/mission-start-failed.event'
import MissionStartFailedSseListener from '#app/modules/notifications/application/listeners/mission-start-failed-sse.listener'

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

test.group('MissionStartFailedSseListener', () => {
  test('notifie TOUS les propriétaires actifs du robot, pas seulement celui qui a déclenché la mission', async ({
    assert,
  }) => {
    const repo = new FakeNotificationRepository()
    const service = new NotificationService(repo, new FakeBroadcaster(), new FakeNotificationUserGateway())
    const ownershipRepo = new FakeOwnershipRepository(
      {},
      { 'dog-1': ['owner-a', 'owner-b', 'owner-c'] }
    )
    const listener = new MissionStartFailedSseListener(service, ownershipRepo)

    const event = new MissionStartFailedEvent(
      'mission-1',
      'Patrouille',
      'dog-1',
      'Rex',
      'ROBOT_OFFLINE'
    )

    await listener.handle(event)

    assert.lengthOf(repo.created, 3)
    const notifiedUserIds = repo.created.map((n) => n.userId).sort()
    assert.deepEqual(notifiedUserIds, ['owner-a', 'owner-b', 'owner-c'])
    assert.isTrue(repo.created.every((n) => n.type === 'mission.start_failed'))
    assert.isTrue(repo.created.every((n) => n.robotDogId === 'dog-1'))
  })
})
