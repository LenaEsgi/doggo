import { test } from '@japa/runner'
import Mission from '#app/modules/missions/domain/entities/mission.entity'
import { MissionNameCannotBeEmptyError } from '#app/modules/missions/domain/exceptions/invalid-mission-name-cannot-be-empty.error'
import { MissionNameTooLongError } from '#app/modules/missions/domain/exceptions/invalid-mission-name-too-long.error'
import { InvalidMissionNotEditableError } from '#app/modules/missions/domain/exceptions/invalid-mission-not-editable.error'
import { InvalidMissionStepNotFoundError } from '#app/modules/missions/domain/exceptions/invalid-mission-step-not-found.error'
import { InvalidMissionStepOrderError } from '#app/modules/missions/domain/exceptions/invalid-mission-step-order.error'
import MissionStep from '#app/modules/missions/domain/entities/mission-step.entity'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { RobotAlreadyAssignedError } from '#app/modules/missions/domain/exceptions/robot-already-assigned.error'
import { MissionNotAssignedToRobotError } from '#app/modules/missions/domain/exceptions/mission-not-assigned-to-robot.error'

test.group('Mission entity', () => {
  test('should create a mission', ({ assert }) => {
    const mission = Mission.create('Test Mission', 'user-1')
    assert.equal(mission.name, 'Test Mission')
    assert.equal(mission.userId, 'user-1')
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
  test('should not allow editing while a run is active', ({ assert }) => {
    const mission = Mission.create('Test', 'user-1')
    assert.throws(() => mission.addStep('action', 'params', true), InvalidMissionNotEditableError)
  })

  test('should allow editing when no run is active', ({ assert }) => {
    const mission = Mission.create('Test', 'user-1')
    mission.addStep('action', 'params', false)
    assert.lengthOf(mission.missionSteps, 1)
  })

  // -------------------
  // syncSteps
  // -------------------
  test('syncSteps reorders existing steps correctly', ({ assert }) => {
    const mission = Mission.create('Test', 'user-1')
    mission.addStep('action-1', 'p1')
    mission.addStep('action-2', 'p2')
    const [step1, step2] = mission.missionSteps

    // Inverser l'ordre
    mission.syncSteps([
      { id: step2.id.value, actionId: step2.actionId, parameters: step2.parameters },
      { id: step1.id.value, actionId: step1.actionId, parameters: step1.parameters },
    ])

    const ordered = mission.getStepsInOrder()
    assert.equal(ordered[0].id.value, step2.id.value)
    assert.equal(ordered[0].order, 1)
    assert.equal(ordered[1].id.value, step1.id.value)
    assert.equal(ordered[1].order, 2)
  })

  test('syncSteps creates new steps (no id)', ({ assert }) => {
    const mission = Mission.create('Test', 'user-1')

    mission.syncSteps([
      { actionId: 'action-new-1', parameters: 'p1' },
      { actionId: 'action-new-2', parameters: 'p2' },
    ])

    assert.lengthOf(mission.missionSteps, 2)
    assert.equal(mission.getStepsInOrder()[0].actionId, 'action-new-1')
    assert.equal(mission.getStepsInOrder()[0].order, 1)
    assert.equal(mission.getStepsInOrder()[1].actionId, 'action-new-2')
    assert.equal(mission.getStepsInOrder()[1].order, 2)
  })

  test('syncSteps removes steps absent from the list', ({ assert }) => {
    const mission = Mission.create('Test', 'user-1')
    mission.addStep('action-1', 'p1')
    mission.addStep('action-2', 'p2')
    mission.addStep('action-3', 'p3')
    const step1 = mission.missionSteps[0]

    // Ne garder que step1
    mission.syncSteps([
      { id: step1.id.value, actionId: step1.actionId, parameters: step1.parameters },
    ])

    assert.lengthOf(mission.missionSteps, 1)
    assert.equal(mission.missionSteps[0].id.value, step1.id.value)
  })

  test('syncSteps throws InvalidMissionStepNotFoundError for unknown id', ({ assert }) => {
    const mission = Mission.create('Test', 'user-1')
    const unknownId = '550e8400-e29b-41d4-a716-446655440000'

    assert.throws(
      () => mission.syncSteps([{ id: unknownId, actionId: 'action-1', parameters: '' }]),
      InvalidMissionStepNotFoundError
    )
  })

  test('syncSteps throws InvalidMissionNotEditableError when a run is active', ({ assert }) => {
    const mission = Mission.create('Test', 'user-1')

    assert.throws(
      () => mission.syncSteps([{ actionId: 'action-1', parameters: '' }], true),
      InvalidMissionNotEditableError
    )
  })

  // -------------------
  // assignRobot / unassignRobot
  // -------------------
  test('should assign a robot to a mission', ({ assert }) => {
    const mission = Mission.create('Test', 'user-1')
    const robotId = RobotDogId.fromString('8570f711-2895-4632-9599-281083096058')

    mission.assignRobot(robotId)

    assert.lengthOf(mission.robotDogIds, 1)
    assert.isTrue(mission.robotDogIds[0].equals(robotId))
  })

  test('should assign the same mission to two different robots', ({ assert }) => {
    const mission = Mission.create('Test', 'user-1')
    const robotA = RobotDogId.fromString('8570f711-2895-4632-9599-281083096058')
    const robotB = RobotDogId.fromString('a1c1b6c2-4e2a-4b0b-9c3d-9f3a1e2d4c5b')

    mission.assignRobot(robotA)
    mission.assignRobot(robotB)

    assert.lengthOf(mission.robotDogIds, 2)
  })

  test('should throw when assigning an already-assigned robot', ({ assert }) => {
    const mission = Mission.create('Test', 'user-1')
    const robotId = RobotDogId.fromString('8570f711-2895-4632-9599-281083096058')
    mission.assignRobot(robotId)

    assert.throws(() => mission.assignRobot(robotId), RobotAlreadyAssignedError)
  })

  test('should unassign a robot from a mission', ({ assert }) => {
    const mission = Mission.create('Test', 'user-1')
    const robotId = RobotDogId.fromString('8570f711-2895-4632-9599-281083096058')
    mission.assignRobot(robotId)

    mission.unassignRobot(robotId)

    assert.lengthOf(mission.robotDogIds, 0)
  })

  test('should throw when unassigning a robot that is not assigned', ({ assert }) => {
    const mission = Mission.create('Test', 'user-1')
    const robotId = RobotDogId.fromString('8570f711-2895-4632-9599-281083096058')

    assert.throws(() => mission.unassignRobot(robotId), MissionNotAssignedToRobotError)
  })
})
