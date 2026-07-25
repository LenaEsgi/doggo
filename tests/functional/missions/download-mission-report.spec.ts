import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import RobotDogModel from '#dogs/infrastructure/database/models/robot-dog'
import MissionModel from '#app/modules/missions/infrastructure/database/models/mission'
import MissionRunModel from '#app/modules/missions/infrastructure/database/models/mission-run'
import MissionReportModel from '#app/modules/missions/infrastructure/database/models/mission-report'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'
import { MissionReportStatus } from '#app/modules/missions/domain/enums/mission-report-status'
import { authenticateAs } from '#tests/functional/helpers/auth'
import OwnershipModel from '#app/modules/users/ownerships/infrastructure/database/models/ownership'

test.group('GET /api/v1/mission-runs/:id/report', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test("retourne 403 si le rapport n'est pas encore prêt", async ({ client, cleanup }) => {
    const auth = await authenticateAs(cleanup, { firebaseUid: 'user-report-1' })
    const dog = await RobotDogModel.create({
      id: randomUUID(),
      serialNumber: 'SN-REPORT-DL-001',
      key: 'ReportDlDogKeyAAA111',
      name: 'ReportDlDog',
      state: RobotDogState.IDLE,
      batteryLevel: 90,
    })
    await OwnershipModel.create({
      userId: auth.user.id,
      robotDogId: dog.id,
      startDate: DateTime.now(),
      endDate: null,
    })
    const mission = await MissionModel.create({
      id: randomUUID(),
      name: 'Patrouille',
      userId: auth.user.id,
    })
    const run = await MissionRunModel.create({
      id: randomUUID(),
      missionId: mission.id,
      robotDogId: dog.id,
      status: MissionRunStatus.SUCCESS,
      startedAt: DateTime.now(),
      endedAt: DateTime.now(),
    })
    await MissionReportModel.create({
      id: randomUUID(),
      missionRunId: run.id,
      robotDogId: dog.id,
      status: MissionReportStatus.PENDING,
      requestedAt: DateTime.now(),
    })

    const response = await client
      .get(`/api/v1/mission-runs/${run.id}/report`)
      .header('Authorization', auth.header)

    response.assertStatus(403)
  })

  test("retourne 403 si l'utilisateur authentifié ne possède pas le robot", async ({
    client,
    cleanup,
  }) => {
    const owner = await authenticateAs(cleanup, { firebaseUid: 'user-report-owner' })
    const intruder = await authenticateAs(cleanup, { firebaseUid: 'user-report-intruder' })
    const dog = await RobotDogModel.create({
      id: randomUUID(),
      serialNumber: 'SN-REPORT-DL-002',
      key: 'ReportDlDogKeyBBB222',
      name: 'ReportDlDog2',
      state: RobotDogState.IDLE,
      batteryLevel: 90,
    })
    await OwnershipModel.create({
      userId: owner.user.id,
      robotDogId: dog.id,
      startDate: DateTime.now(),
      endDate: null,
    })
    const mission = await MissionModel.create({
      id: randomUUID(),
      name: 'Patrouille',
      userId: owner.user.id,
    })
    const run = await MissionRunModel.create({
      id: randomUUID(),
      missionId: mission.id,
      robotDogId: dog.id,
      status: MissionRunStatus.SUCCESS,
      startedAt: DateTime.now(),
      endedAt: DateTime.now(),
    })
    await MissionReportModel.create({
      id: randomUUID(),
      missionRunId: run.id,
      robotDogId: dog.id,
      status: MissionReportStatus.READY,
      gcsObjectPath: 'mission-reports/some-path.pdf',
      requestedAt: DateTime.now(),
      completedAt: DateTime.now(),
    })

    const response = await client
      .get(`/api/v1/mission-runs/${run.id}/report`)
      .header('Authorization', intruder.header)

    response.assertStatus(403)
  })
})
