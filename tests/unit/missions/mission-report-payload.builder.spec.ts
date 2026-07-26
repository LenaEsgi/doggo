import { test } from '@japa/runner'
import MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'
import MissionRunStep from '#app/modules/missions/domain/entities/mission-run-step.entity'
import { MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'
import { MissionStepStatus } from '#app/modules/missions/domain/enums/mission-step-status'
import { MissionRunRepository } from '#app/modules/missions/domain/contracts/mission-run.repository'
import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import { RobotDogGateway } from '#app/modules/missions/application/contracts/robot-dog.gateway'
import { ActionRepository } from '#app/modules/actions/domain/contracts/action.repository'
import Mission from '#app/modules/missions/domain/entities/mission.entity'
import MissionStep from '#app/modules/missions/domain/entities/mission-step.entity'
import Action from '#app/modules/actions/domain/action.entity'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { MissionReportPayloadBuilder } from '#app/modules/missions/application/services/mission-report-payload.builder'

const noop = () => {
  throw new Error('not implemented in fake')
}

test.group('MissionReportPayloadBuilder', () => {
  test('assemble un payload complet avec le nom du robot et des steps résolus', async ({ assert }) => {
    const missionId = '550e8400-e29b-41d4-a716-446655440000'
    const runId = '550e8400-e29b-41d4-a716-446655440001'
    const dogId = '550e8400-e29b-41d4-a716-446655440002'
    const runStepId = '550e8400-e29b-41d4-a716-446655440003'

    const action = Action.create('WALK_FORWARD', 'Avancer', 'walk-forward', null)
    const missionStep = MissionStep.create(action.id.value, 1, '{}')

    const mission = Mission.rehydrate(missionId, 'Patrouille', 'user-1', [missionStep])

    const runStep = MissionRunStep.rehydrate(runStepId, missionStep.id.value, MissionStepStatus.COMPLETED, 1)
    const run = MissionRun.rehydrate(
      runId,
      missionId,
      dogId,
      MissionRunStatus.SUCCESS,
      [runStep],
      new Date('2026-07-25T10:00:00.000Z'),
      new Date('2026-07-25T10:15:00.000Z')
    )

    const missionRunRepository: MissionRunRepository = {
      listActiveRuns: noop,
      findActiveRun: noop,
      findActiveRunForUpdate: noop,
      findActiveRunByRobotDog: noop,
      findActiveRunByRobotDogForUpdate: noop,
      hasActiveRunForMission: noop,
      save: noop,
      findById: async () => run,
    }

    const missionRepository: MissionRepository = {
      findById: async () => mission,
    } as unknown as MissionRepository

    const robotDogGateway: RobotDogGateway = {
      findBy: async () =>
        RobotDog.rehydrate(dogId, 'SN-1', 'ROBOTDOGKEY0000001', 'Rex', RobotDogState.IDLE, 80, new Date()),
    } as unknown as RobotDogGateway

    const actionRepository: ActionRepository = {
      findById: async () => action,
      findByCode: noop,
      index: noop,
      save: noop,
    }

    const builder = new MissionReportPayloadBuilder(
      missionRunRepository,
      missionRepository,
      robotDogGateway,
      actionRepository
    )

    const payload = await builder.build(runId, 'Patrouille')

    assert.isNotNull(payload)
    assert.equal(payload?.missionRunId, runId)
    assert.equal(payload?.robotDogName, 'Rex')
    assert.equal(payload?.status, 'SUCCESS')
    assert.equal(payload?.startedAt, '2026-07-25T10:00:00.000Z')
    assert.equal(payload?.endedAt, '2026-07-25T10:15:00.000Z')
    assert.lengthOf(payload?.steps ?? [], 1)
    assert.equal(payload?.steps[0].name, 'Avancer')
    assert.equal(payload?.steps[0].status, 'COMPLETED')
  })

  test('retourne null si le run n\'existe plus', async ({ assert }) => {
    const missionRunRepository: MissionRunRepository = {
      listActiveRuns: noop,
      findActiveRun: noop,
      findActiveRunForUpdate: noop,
      findActiveRunByRobotDog: noop,
      findActiveRunByRobotDogForUpdate: noop,
      hasActiveRunForMission: noop,
      save: noop,
      findById: async () => null,
    }

    const builder = new MissionReportPayloadBuilder(
      missionRunRepository,
      {} as MissionRepository,
      {} as RobotDogGateway,
      {} as ActionRepository
    )

    const payload = await builder.build('run-404', 'Patrouille')
    assert.isNull(payload)
  })
})
