import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import RobotDogModel from '#dogs/infrastructure/database/models/robot-dog'
import MissionModel from '#app/modules/missions/infrastructure/database/models/mission'
import MissionRunModel from '#app/modules/missions/infrastructure/database/models/mission-run'
import UserModel from '#users/infrastructure/database/models/user'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { UserRole } from '#users/domain/enums/user.role'
import { MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'
import MissionReport from '#app/modules/missions/domain/entities/mission-report.entity'
import { MissionReportRepositoryImplementation } from '#app/modules/missions/infrastructure/database/repositories/mission-report.repository.implementation'

test.group('MissionReportRepositoryImplementation', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('save() puis findByMissionRunId() retrouve un rapport READY', async ({ assert }) => {
    const dog = await RobotDogModel.create({
      id: randomUUID(),
      serialNumber: 'SN-REPORT-001',
      key: 'ReportTestDogKeyAAA1',
      name: 'ReportDog',
      state: RobotDogState.IDLE,
      batteryLevel: 90,
    })
    const user = await UserModel.create({
      firebaseUid: `firebase-uid-report-${randomUUID()}`,
      firstname: 'Test',
      lastname: 'User',
      email: `report-${randomUUID()}@example.com`,
      role: UserRole.USER,
    })
    const mission = await MissionModel.create({ id: randomUUID(), name: 'Patrouille', userId: user.id })
    const run = await MissionRunModel.create({
      id: randomUUID(),
      missionId: mission.id,
      robotDogId: dog.id,
      status: MissionRunStatus.SUCCESS,
      startedAt: DateTime.now(),
      endedAt: DateTime.now(),
    })

    const repository = new MissionReportRepositoryImplementation()
    const report = MissionReport.create(run.id, dog.id)
    report.markReady('mission-reports/some-path.pdf')
    await repository.save(report)

    const found = await repository.findByMissionRunId(run.id)

    assert.isNotNull(found)
    assert.equal(found?.status, 'READY')
    assert.equal(found?.gcsObjectPath, 'mission-reports/some-path.pdf')
  })
})
