import { test } from '@japa/runner'
import Mission from '#app/modules/missions/domain/entities/mission.entity'
import { MissionStatus } from '#app/modules/missions/domain/enums/mission-status'
import { MissionNameCannotBeEmptyError } from '#app/modules/missions/domain/exceptions/invalid-mission-name-cannot-be-empty.error'
import { MissionNameTooLongError } from '#app/modules/missions/domain/exceptions/invalid-mission-name-too-long.error'
import { InvalidMissionAlreadyRunningError } from '#app/modules/missions/domain/exceptions/invalid-mission-already-running.error'
import { InvalidMissionNotEditableError } from '#app/modules/missions/domain/exceptions/invalid-mission-not-editable.error'
import { InvalidMissionStepNotFoundError } from '#app/modules/missions/domain/exceptions/invalid-mission-step-not-found.error'
import { InvalidMissionStepOrderError } from '#app/modules/missions/domain/exceptions/invalid-mission-step-order.error'
import { InvalidMissionNotRunningError } from '#app/modules/missions/domain/exceptions/Invalid-mission-not-running.error'
import MissionStep from '#app/modules/missions/domain/entities/mission-step.entity'

test.group('Mission entity', () => {
  test('should create a mission with default status', ({ assert }) => {
    const mission = Mission.create('Test Mission', 'user-1')
    assert.equal(mission.name, 'Test Mission')
    assert.equal(mission.userId, 'user-1')
    assert.equal(mission.status, MissionStatus.STAND_BY)
    assert.lengthOf(mission.missionSteps, 0)
  })

  // -------------------
  // rename
  // -------------------
  test('should rename mission', ({ assert }) => {
    const mission = Mission.create('Old Name', 'user-1')
    mission.rename('New Name')
    assert.equal(mission.name, 'New Name')
  })

  test('should throw error if rename empty', ({ assert }) => {
    const mission = Mission.create('Old Name', 'user-1')
    assert.throws(() => mission.rename(''), MissionNameCannotBeEmptyError)
    assert.throws(() => mission.rename('   '), MissionNameCannotBeEmptyError)
  })

  test('should throw error if rename too long', ({ assert }) => {
    const mission = Mission.create('Old Name', 'user-1')
    const longName = 'a'.repeat(101)
    assert.throws(() => mission.rename(longName), MissionNameTooLongError)
  })

  // -------------------
  // startMission / endMission / interruptMission
  // -------------------
  test('should start mission', ({ assert }) => {
    const mission = Mission.create('Test', 'user-1')
    mission.startMission()
    assert.equal(mission.status, MissionStatus.RUNNING)
  })

  test('should not start already running mission', ({ assert }) => {
    const mission = Mission.create('Test', 'user-1')
    mission.startMission()
    assert.throws(() => mission.startMission(), InvalidMissionAlreadyRunningError)
  })

  test('should end mission', ({ assert }) => {
    const mission = Mission.create('Test', 'user-1')
    mission.startMission()
    mission.endMission()
    assert.equal(mission.status, MissionStatus.STAND_BY)
  })

  test('should not end mission not running', ({ assert }) => {
    const mission = Mission.create('Test', 'user-1')
    assert.throws(() => mission.endMission(), InvalidMissionNotRunningError)
  })

  test('should interrupt mission', ({ assert }) => {
    const mission = Mission.create('Test', 'user-1')
    mission.startMission()
    mission.interruptMission()
    assert.equal(mission.status, MissionStatus.INTERRUPTED)
  })

  test('should not interrupt mission not running', ({ assert }) => {
    const mission = Mission.create('Test', 'user-1')
    assert.throws(() => mission.interruptMission(), InvalidMissionNotRunningError)
  })

  // -------------------
  // Steps
  // -------------------
  test('should add step', ({ assert }) => {
    const mission = Mission.create('Test', 'user-1')
    mission.addStep('action-1', 'params')
    assert.lengthOf(mission.missionSteps, 1)
    assert.equal(mission.missionSteps[0].order, 1)
  })

  test('should remove step', ({ assert }) => {
    const mission = Mission.create('Test', 'user-1')
    mission.addStep('action-1', 'params')
    const stepId = mission.missionSteps[0].id
    mission.removeStep(stepId)
    assert.lengthOf(mission.missionSteps, 0)
  })

  test('should throw if remove non-existent step', ({ assert }) => {
    const mission = Mission.create('Test', 'user-1')
    assert.throws(
      () => mission.removeStep(MissionStep.create('action', 1, 'params').id),
      InvalidMissionStepNotFoundError
    )
  })

  test('should reorder steps when remove', ({ assert }) => {
    const mission = Mission.create('Test', 'user-1')
    mission.addStep('action-1', 'p1')
    mission.addStep('action-2', 'p2')
    mission.addStep('action-3', 'p3')
    const step2Id = mission.missionSteps[1].id
    mission.removeStep(step2Id)
    assert.equal(mission.missionSteps[1].order, 2)
  })

  test('should move step', ({ assert }) => {
    const mission = Mission.create('Test', 'user-1')
    mission.addStep('action-1', 'p1')
    mission.addStep('action-2', 'p2')
    const step1Id = mission.missionSteps[0].id
    mission.moveStep(step1Id, 2)
    assert.equal(mission.getStepsInOrder()[0].order, 1)
    assert.equal(mission.getStepsInOrder()[1].order, 2)
  })

  test('should throw if move step invalid order', ({ assert }) => {
    const mission = Mission.create('Test', 'user-1')
    mission.addStep('action-1', 'p1')
    const stepId = mission.missionSteps[0].id
    assert.throws(() => mission.moveStep(stepId, 0), InvalidMissionStepOrderError)
    assert.throws(() => mission.moveStep(stepId, 2), InvalidMissionStepOrderError)
  })

  test('should throw if move non-existent step', ({ assert }) => {
    const mission = Mission.create('Test', 'user-1')
    assert.throws(
      () => mission.moveStep(MissionStep.create('action', 1, 'params').id, 1),
      InvalidMissionStepNotFoundError
    )
  })

  // -------------------
  // ensureEditable
  // -------------------
  test('should not allow editing if not STAND_BY', ({ assert }) => {
    const mission = Mission.create('Test', 'user-1')
    mission.startMission()
    assert.throws(() => mission.addStep('action', 'params'), InvalidMissionNotEditableError)
  })
})
