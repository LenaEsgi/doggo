import { test } from '@japa/runner'
import MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { MissionStepId } from '#app/modules/missions/domain/value-objects/mission-step-id'
import { MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'
import { InvalidMissionStepNotFoundError } from '#app/modules/missions/domain/exceptions/invalid-mission-step-not-found.error'
import { NoActiveMissionRunError } from '#app/modules/missions/domain/exceptions/no-active-mission-run.error'

test.group('MissionRun entity', () => {
  test('starts PENDING with one PENDING run step per given step id', ({ assert }) => {
    const stepId1 = MissionStepId.generate()
    const stepId2 = MissionStepId.generate()
    const run = MissionRun.start(MissionId.generate(), RobotDogId.generate(), [stepId1, stepId2])

    assert.equal(run.status, MissionRunStatus.PENDING)
    assert.lengthOf(run.runSteps, 2)
    assert.isNull(run.endedAt)
    assert.isFalse(run.isTerminal)
  })

  test('confirm() moves a PENDING run to RUNNING', ({ assert }) => {
    const run = MissionRun.start(MissionId.generate(), RobotDogId.generate(), [MissionStepId.generate()])

    run.confirm()

    assert.equal(run.status, MissionRunStatus.RUNNING)
    assert.isFalse(run.isTerminal)
  })

  test('confirm() throws when the run is not PENDING', ({ assert }) => {
    const run = MissionRun.start(MissionId.generate(), RobotDogId.generate(), [MissionStepId.generate()])
    run.confirm()

    assert.throws(() => run.confirm(), NoActiveMissionRunError)
  })

  test('cannot complete a step while the run is still PENDING (not confirmed)', ({ assert }) => {
    const stepId = MissionStepId.generate()
    const run = MissionRun.start(MissionId.generate(), RobotDogId.generate(), [stepId])

    assert.throws(() => run.completeStep(stepId), NoActiveMissionRunError)
  })

  test('completing all steps makes the run SUCCESS', ({ assert }) => {
    const stepId1 = MissionStepId.generate()
    const stepId2 = MissionStepId.generate()
    const run = MissionRun.start(MissionId.generate(), RobotDogId.generate(), [stepId1, stepId2])
    run.confirm()

    run.completeStep(stepId1)
    assert.equal(run.status, MissionRunStatus.RUNNING)

    run.completeStep(stepId2)
    assert.equal(run.status, MissionRunStatus.SUCCESS)
    assert.isTrue(run.isTerminal)
    assert.isNotNull(run.endedAt)
  })

  test('failing one step makes the run FAILED even if others are pending', ({ assert }) => {
    const stepId1 = MissionStepId.generate()
    const stepId2 = MissionStepId.generate()
    const run = MissionRun.start(MissionId.generate(), RobotDogId.generate(), [stepId1, stepId2])
    run.confirm()

    run.failStep(stepId1)

    assert.equal(run.status, MissionRunStatus.FAILED)
    assert.isTrue(run.isTerminal)
  })

  test('throws when completing an unknown step', ({ assert }) => {
    const run = MissionRun.start(MissionId.generate(), RobotDogId.generate(), [MissionStepId.generate()])
    run.confirm()

    assert.throws(() => run.completeStep(MissionStepId.generate()), InvalidMissionStepNotFoundError)
  })

  test('interrupt() moves a running run to INTERRUPTED', ({ assert }) => {
    const run = MissionRun.start(MissionId.generate(), RobotDogId.generate(), [MissionStepId.generate()])
    run.confirm()

    run.interrupt()

    assert.equal(run.status, MissionRunStatus.INTERRUPTED)
    assert.isTrue(run.isTerminal)
  })

  test('interrupt() also cancels a PENDING run that was never confirmed', ({ assert }) => {
    const run = MissionRun.start(MissionId.generate(), RobotDogId.generate(), [MissionStepId.generate()])

    run.interrupt()

    assert.equal(run.status, MissionRunStatus.INTERRUPTED)
    assert.isTrue(run.isTerminal)
  })

  test('cannot interrupt a run that is already terminal', ({ assert }) => {
    const stepId = MissionStepId.generate()
    const run = MissionRun.start(MissionId.generate(), RobotDogId.generate(), [stepId])
    run.confirm()
    run.completeStep(stepId)

    assert.throws(() => run.interrupt(), NoActiveMissionRunError)
  })

  test('cannot report progress on a run that is already terminal', ({ assert }) => {
    const stepId = MissionStepId.generate()
    const run = MissionRun.start(MissionId.generate(), RobotDogId.generate(), [stepId])
    run.confirm()
    run.completeStep(stepId)

    assert.throws(() => run.failStep(stepId), NoActiveMissionRunError)
  })

  test('rehydrates from stored values', ({ assert }) => {
    const missionId = MissionId.generate()
    const robotDogId = RobotDogId.generate()
    const run = MissionRun.start(missionId, robotDogId, [MissionStepId.generate()])

    const rehydrated = MissionRun.rehydrate(
      run.id.value,
      missionId.value,
      robotDogId.value,
      MissionRunStatus.RUNNING,
      run.runSteps,
      run.startedAt,
      null
    )

    assert.isTrue(rehydrated.id.equals(run.id))
    assert.equal(rehydrated.status, MissionRunStatus.RUNNING)
  })
})
