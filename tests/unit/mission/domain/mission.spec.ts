import { test } from '@japa/runner'
import Mission from '#app/modules/missions/domain/entities/mission.entity'
import { MissionStatus } from '#app/modules/missions/domain/enums/mission-status'
import { MissionStepId } from '#app/modules/missions/domain/value-objects/mission-step-id'

import {
  InvalidMissionAlreadyRunningError
} from '#app/modules/missions/domain/exceptions/invalid-mission-already-running.error'
import { InvalidMissionNotEditableError } from '#app/modules/missions/domain/exceptions/invalid-mission-not-editable.error'
import { InvalidMissionStepNotFoundError } from '#app/modules/missions/domain/exceptions/invalid-mission-step-not-found.error'
import { InvalidMissionStepOrderError } from '#app/modules/missions/domain/exceptions/invalid-mission-step-order.error'
import {
  InvalidMissionNotRunningError
} from '#app/modules/missions/domain/exceptions/Invalid-mission-not-running.error'

test.group('Mission Entity', () => {

  test('should create a mission', ({ assert }) => {
    const mission = Mission.create('Test Mission')

    assert.equal(mission['_status'], MissionStatus.STAND_BY)
    assert.equal(mission['_missionSteps'].length, 0)
  })

  // ------------------------
  // Status transitions
  // ------------------------
  test('start mission sets status to RUNNING', ({ assert }) => {
    const mission = Mission.create('Test')
    mission.startMission()
    assert.equal(mission['_status'], MissionStatus.RUNNING)
  })

  test('start mission throws if already RUNNING', ({ assert }) => {
    const mission = Mission.create('Test')
    mission.startMission()
    assert.throws(() => mission.startMission(), InvalidMissionAlreadyRunningError)
  })

  test('end mission sets status to STAND_BY', ({ assert }) => {
    const mission = Mission.create('Test')
    mission.startMission()
    mission.endMission()
    assert.equal(mission['_status'], MissionStatus.STAND_BY)
  })

  test('end mission throws if not running', ({ assert }) => {
    const mission = Mission.create('Test')
    assert.throws(() => mission.endMission(), InvalidMissionNotRunningError)
  })

  test('interrupt mission sets status to INTERRUPTED', ({ assert }) => {
    const mission = Mission.create('Test')
    mission.startMission()
    mission.interruptMission()
    assert.equal(mission['_status'], MissionStatus.INTERRUPTED)
  })

  test('interrupt mission throws if not running', ({ assert }) => {
    const mission = Mission.create('Test')
    assert.throws(() => mission.interruptMission(), InvalidMissionNotRunningError)
  })

  // ------------------------
  // Steps
  // ------------------------
  test('addStep adds a mission step', ({ assert }) => {
    const mission = Mission.create('Test')
    mission.addStep('action1', 'params1')

    assert.equal(mission['_missionSteps'].length, 1)
    assert.equal(mission['_missionSteps'][0].order, 1)
    assert.equal(mission['_missionSteps'][0].status, 'PENDING')
  })

  test('addStep throws if mission not editable', ({ assert }) => {
    const mission = Mission.create('Test')
    mission.startMission()
    assert.throws(() => mission.addStep('action1', 'params1'), InvalidMissionNotEditableError)
  })

  test('removeStep removes a step', ({ assert }) => {
    const mission = Mission.create('Test')
    mission.addStep('a1', 'p1')
    const stepId = mission['_missionSteps'][0].id

    mission.removeStep(stepId)
    assert.equal(mission['_missionSteps'].length, 0)
  })

  test('removeStep throws if step not found', ({ assert }) => {
    const mission = Mission.create('Test')
    assert.throws(() => mission.removeStep(MissionStepId.generate()), InvalidMissionStepNotFoundError)
  })

  test('removeStep reorders steps', ({ assert }) => {
    const mission = Mission.create('Test')
    mission.addStep('a1','p1')
    mission.addStep('a2','p2')
    mission.addStep('a3','p3')

    const stepId = mission['_missionSteps'][1].id
    mission.removeStep(stepId)

    const orders = mission['_missionSteps'].map(s => s.order)
    assert.deepEqual(orders, [1,2])
  })

  test('moveStep updates sequenceOrder correctly', ({ assert }) => {
    const mission = Mission.create('Test')

    mission.addStep('a1', 'p1')
    mission.addStep('a2', 'p2')
    mission.addStep('a3', 'p3')
    mission.addStep('a4', 'p4')

    const step4Id = mission['_missionSteps'].find(s => s.order === 4)!.id
    mission.moveStep(step4Id, 2)

    const orderedSteps = mission.getStepsInOrder()

    const orders = orderedSteps.map(s => s.order)
    assert.deepEqual(orders, [1, 2, 3, 4])

    assert.isTrue(orderedSteps[1].id.equals(step4Id))
  })

  test('moveStep throws if new position invalid', ({ assert }) => {
    const mission = Mission.create('Test')
    mission.addStep('a1','p1')
    const stepId = mission['_missionSteps'][0].id

    assert.throws(() => mission.moveStep(stepId, 0), InvalidMissionStepOrderError)
    assert.throws(() => mission.moveStep(stepId, 5), InvalidMissionStepOrderError)
  })

  test('moveStep throws if step not found', ({ assert }) => {
    const mission = Mission.create('Test')
    assert.throws(() => mission.moveStep(MissionStepId.generate(), 1), InvalidMissionStepNotFoundError)
  })

})
