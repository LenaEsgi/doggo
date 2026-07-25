import { test } from '@japa/runner'
import MissionCompletedEvent from '#app/modules/missions/domain/events/mission-completed.event'
import { MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'
import { MissionReportRepository } from '#app/modules/missions/domain/contracts/mission-report.repository'
import { MissionReportRequestPublisher } from '#app/modules/missions/domain/contracts/mission-report-request-publisher'
import MissionReport from '#app/modules/missions/domain/entities/mission-report.entity'
import MissionReportRequestListener from '#app/modules/missions/application/listeners/mission-report-request.listener'
import { MissionReportPayloadBuilder } from '#app/modules/missions/application/services/mission-report-payload.builder'

class FakeMissionReportRepository extends MissionReportRepository {
  readonly saved: MissionReport[] = []
  async save(report: MissionReport): Promise<void> {
    this.saved.push(report)
  }
  async findByMissionRunId(): Promise<MissionReport | null> {
    return null
  }
}

class FakePublisher extends MissionReportRequestPublisher {
  readonly published: unknown[] = []
  async publish(payload: unknown): Promise<void> {
    this.published.push(payload)
  }
}

class FailingPublisher extends MissionReportRequestPublisher {
  async publish(): Promise<void> {
    throw new Error('RabbitMQ down')
  }
}

test.group('MissionReportRequestListener', () => {
  test('sauvegarde un rapport PENDING puis publie la requête sur la queue', async ({ assert }) => {
    const reportRepository = new FakeMissionReportRepository()
    const publisher = new FakePublisher()
    const builder = {
      build: async () => ({
        missionRunId: 'run-1',
        missionName: 'Patrouille',
        robotDogName: 'Rex',
        status: 'SUCCESS' as const,
        startedAt: '2026-07-25T10:00:00.000Z',
        endedAt: '2026-07-25T10:15:00.000Z',
        steps: [],
      }),
    } as unknown as MissionReportPayloadBuilder

    const listener = new MissionReportRequestListener(builder, reportRepository, publisher)
    const event = new MissionCompletedEvent('mission-1', 'Patrouille', 'run-1', 'dog-1', MissionRunStatus.SUCCESS)

    await listener.handle(event)

    assert.lengthOf(reportRepository.saved, 1)
    assert.equal(reportRepository.saved[0].missionRunId, 'run-1')
    assert.equal(reportRepository.saved[0].status, 'PENDING')
    assert.lengthOf(publisher.published, 1)
  })

  test('avale silencieusement une erreur de publication (soft-fail)', async ({ assert }) => {
    const reportRepository = new FakeMissionReportRepository()
    const publisher = new FailingPublisher()
    const builder = {
      build: async () => ({
        missionRunId: 'run-1',
        missionName: 'Patrouille',
        robotDogName: 'Rex',
        status: 'SUCCESS' as const,
        startedAt: '2026-07-25T10:00:00.000Z',
        endedAt: null,
        steps: [],
      }),
    } as unknown as MissionReportPayloadBuilder

    const listener = new MissionReportRequestListener(builder, reportRepository, publisher)
    const event = new MissionCompletedEvent('mission-1', 'Patrouille', 'run-1', 'dog-1', MissionRunStatus.SUCCESS)

    await assert.doesNotReject(() => listener.handle(event))
  })
})
