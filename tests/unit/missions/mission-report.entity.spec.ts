import { test } from '@japa/runner'
import MissionReport from '#app/modules/missions/domain/entities/mission-report.entity'
import { MissionReportStatus } from '#app/modules/missions/domain/enums/mission-report-status'

test.group('MissionReport entity', () => {
  test('create() démarre en PENDING sans chemin GCS ni raison d\'échec', ({ assert }) => {
    const report = MissionReport.create('run-1', 'dog-1')

    assert.equal(report.status, MissionReportStatus.PENDING)
    assert.equal(report.missionRunId, 'run-1')
    assert.equal(report.robotDogId, 'dog-1')
    assert.isNull(report.gcsObjectPath)
    assert.isNull(report.failureReason)
    assert.isNull(report.completedAt)
  })

  test('markReady() passe en READY et enregistre le chemin GCS + completedAt', ({ assert }) => {
    const report = MissionReport.create('run-1', 'dog-1')

    report.markReady('mission-reports/run-1.pdf')

    assert.equal(report.status, MissionReportStatus.READY)
    assert.equal(report.gcsObjectPath, 'mission-reports/run-1.pdf')
    assert.isNotNull(report.completedAt)
  })

  test('markFailed() passe en FAILED et enregistre la raison + completedAt', ({ assert }) => {
    const report = MissionReport.create('run-1', 'dog-1')

    report.markFailed('gcs upload timeout')

    assert.equal(report.status, MissionReportStatus.FAILED)
    assert.equal(report.failureReason, 'gcs upload timeout')
    assert.isNotNull(report.completedAt)
  })

  test('markFailed() tronque une raison trop longue à 2000 caractères', ({ assert }) => {
    const report = MissionReport.create('run-1', 'dog-1')
    const veryLongReason = 'x'.repeat(5000)

    report.markFailed(veryLongReason)

    assert.equal(report.failureReason?.length, 2000)
    assert.equal(report.failureReason, 'x'.repeat(2000))
  })
})
