import { test } from '@japa/runner'
import { NotificationService } from '#app/modules/notifications/application/notification.service'
import { RealtimeBroadcaster } from '#app/modules/notifications/domain/contracts/realtime-broadcaster'
import { NotificationUserGateway } from '#app/modules/notifications/domain/gateways/notification-user.gateway'
import {
  NotificationRepository,
  type NotificationRecord,
  type CreateNotificationData,
} from '#app/modules/notifications/domain/contracts/notification.repository'
import { MissionReportRepository } from '#app/modules/missions/domain/contracts/mission-report.repository'
import MissionReport from '#app/modules/missions/domain/entities/mission-report.entity'
import { FakeOwnershipRepository } from '#tests/unit/fakes/fake-ownership-repository'
import { HandleMissionReportResponseUseCase } from '#app/modules/missions/application/use-cases/handle-mission-report-response.use-case'
import type { PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'
import type { UserLocale } from '#users/domain/user.entity'

class FakeNotificationRepository extends NotificationRepository {
  readonly created: CreateNotificationData[] = []
  async create(data: CreateNotificationData): Promise<NotificationRecord> {
    this.created.push(data)
    return { ...data, id: 'notif-1', payload: data.payload ?? null, isRead: false, createdAt: '2026-07-25T00:00:00.000Z' }
  }
  async createMany(data: CreateNotificationData[]): Promise<NotificationRecord[]> {
    this.created.push(...data)
    return data.map((d, i) => ({ ...d, id: `notif-${i}`, payload: d.payload ?? null, isRead: false, createdAt: '2026-07-25T00:00:00.000Z' }))
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

class FakeMissionReportRepository extends MissionReportRepository {
  readonly saved: MissionReport[] = []
  constructor(private readonly existing: MissionReport) {
    super()
  }
  async save(report: MissionReport): Promise<void> {
    this.saved.push(report)
  }
  async findByMissionRunId(): Promise<MissionReport | null> {
    return this.existing
  }
}

test.group('HandleMissionReportResponseUseCase', () => {
  test('sur succès : marque READY et notifie tous les propriétaires du robot', async ({ assert }) => {
    const notificationRepository = new FakeNotificationRepository()
    const notificationService = new NotificationService(
      notificationRepository,
      new FakeBroadcaster(),
      new FakeNotificationUserGateway()
    )
    const ownershipRepository = new FakeOwnershipRepository({}, { 'dog-1': ['owner-a', 'owner-b'] })
    const existing = MissionReport.create('run-1', 'dog-1')
    const reportRepository = new FakeMissionReportRepository(existing)

    const useCase = new HandleMissionReportResponseUseCase(
      reportRepository,
      ownershipRepository,
      notificationService
    )

    await useCase.execute({ missionRunId: 'run-1', status: 'SUCCESS', gcsObjectPath: 'mission-reports/run-1.pdf' })

    assert.equal(reportRepository.saved[0].status, 'READY')
    assert.equal(reportRepository.saved[0].gcsObjectPath, 'mission-reports/run-1.pdf')
    assert.lengthOf(notificationRepository.created, 2)
    assert.isTrue(notificationRepository.created.every((n) => n.type === 'mission.report_ready'))
  })

  test('sur échec : marque FAILED avec la raison et notifie en report_failed', async ({ assert }) => {
    const notificationRepository = new FakeNotificationRepository()
    const notificationService = new NotificationService(
      notificationRepository,
      new FakeBroadcaster(),
      new FakeNotificationUserGateway()
    )
    const ownershipRepository = new FakeOwnershipRepository({}, { 'dog-1': ['owner-a'] })
    const existing = MissionReport.create('run-1', 'dog-1')
    const reportRepository = new FakeMissionReportRepository(existing)

    const useCase = new HandleMissionReportResponseUseCase(
      reportRepository,
      ownershipRepository,
      notificationService
    )

    await useCase.execute({ missionRunId: 'run-1', status: 'FAILED', reason: 'gcs upload timeout' })

    assert.equal(reportRepository.saved[0].status, 'FAILED')
    assert.equal(reportRepository.saved[0].failureReason, 'gcs upload timeout')
    assert.isTrue(notificationRepository.created.every((n) => n.type === 'mission.report_failed'))
  })
})
