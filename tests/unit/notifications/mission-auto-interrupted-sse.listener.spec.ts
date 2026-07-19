import { test } from '@japa/runner'
import MissionAutoInterruptedSseListener from '#app/modules/notifications/application/listeners/mission-auto-interrupted-sse.listener'
import MissionAutoInterruptedEvent from '#app/modules/missions/domain/events/mission-auto-interrupted.event'
import { NotificationService } from '#app/modules/notifications/application/notification.service'
import {
  NotificationRepository,
  type NotificationRecord,
  type CreateNotificationData,
  type FindNotificationsParams,
} from '#app/modules/notifications/domain/contracts/notification.repository'
import { RealtimeBroadcaster } from '#app/modules/notifications/domain/contracts/realtime-broadcaster'
import type { PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'

const USER_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5'
const MISSION_ID = 'b2c3d4e5-f6a7-4b8c-9d0e-f1a2b3c4d5e6'
const DOG_ID = 'c3d4e5f6-a7b8-4c9d-0e1f-a2b3c4d5e6f7'

const FAKE_RECORD: NotificationRecord = {
  id: 'notif-1',
  userId: USER_ID,
  type: 'mission.interrupted',
  message: 'La mission Patrouille a été interrompue sur le robot Rex',
  severity: 'critical',
  payload: { missionName: 'Patrouille' },
  robotDogId: null,
  isRead: false,
  createdAt: '2026-06-22T10:00:00.000Z',
}

class FakeNotificationRepository extends NotificationRepository {
  readonly created: CreateNotificationData[] = []

  async create(data: CreateNotificationData): Promise<NotificationRecord> {
    this.created.push(data)
    return { ...FAKE_RECORD, ...data }
  }

  async createMany(data: CreateNotificationData[]): Promise<NotificationRecord[]> {
    this.created.push(...data)
    return data.map((item) => ({ ...FAKE_RECORD, ...item }))
  }

  async findByUser(
    _userId: string,
    _params: FindNotificationsParams
  ): Promise<PaginatedResult<NotificationRecord>> {
    return { data: [], meta: { total: 0, perPage: 20, currentPage: 1, firstPage: 1, lastPage: 1 } }
  }

  async markAllReadByUser(_userId: string): Promise<void> {}
}

class ThrowingNotificationRepository extends FakeNotificationRepository {
  async create(_data: CreateNotificationData): Promise<NotificationRecord> {
    throw new Error('db unavailable')
  }
}

class FakeBroadcaster extends RealtimeBroadcaster {
  public calls: { channel: string; payload: Record<string, unknown> }[] = []

  broadcast(channel: string, payload: Record<string, unknown>): void {
    this.calls.push({ channel, payload })
  }
}

test.group('MissionAutoInterruptedSseListener', () => {
  test('crée une notification mission.interrupted avec sévérité critical', async ({ assert }) => {
    const repo = new FakeNotificationRepository()
    const service = new NotificationService(repo, new FakeBroadcaster())
    const listener = new MissionAutoInterruptedSseListener(service)

    await listener.handle(
      new MissionAutoInterruptedEvent(USER_ID, MISSION_ID, 'Patrouille', DOG_ID, 'ROBOT_OFFLINE')
    )

    assert.lengthOf(repo.created, 1)
    assert.equal(repo.created[0].userId, USER_ID)
    assert.equal(repo.created[0].type, 'mission.interrupted')
    assert.equal(repo.created[0].severity, 'critical')
    assert.deepEqual(repo.created[0].payload, {
      missionName: 'Patrouille',
      reason: 'ROBOT_OFFLINE',
    })
  })

  test('transmet la reason MAX_DURATION dans le payload de la notification', async ({ assert }) => {
    const repo = new FakeNotificationRepository()
    const service = new NotificationService(repo, new FakeBroadcaster())
    const listener = new MissionAutoInterruptedSseListener(service)

    await listener.handle(
      new MissionAutoInterruptedEvent(USER_ID, MISSION_ID, 'Patrouille', DOG_ID, 'MAX_DURATION')
    )

    assert.deepEqual(repo.created[0].payload, {
      missionName: 'Patrouille',
      reason: 'MAX_DURATION',
    })
  })

  test('ne plante pas si la création de la notification échoue', async ({ assert }) => {
    const repo = new ThrowingNotificationRepository()
    const service = new NotificationService(repo, new FakeBroadcaster())
    const listener = new MissionAutoInterruptedSseListener(service)

    await assert.doesNotReject(() =>
      listener.handle(
        new MissionAutoInterruptedEvent(USER_ID, MISSION_ID, 'Patrouille', DOG_ID, 'MAX_DURATION')
      )
    )
  })
})
