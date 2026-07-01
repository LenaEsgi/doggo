import { test } from '@japa/runner'
import MissionRunStep from '#app/modules/missions/domain/entities/mission-run-step.entity'
import { MissionStepId } from '#app/modules/missions/domain/value-objects/mission-step-id'
import { MissionStepStatus } from '#app/modules/missions/domain/enums/mission-step-status'
import { InvalidMissionStepTransitionError } from '#app/modules/missions/domain/exceptions/invalid-mission-step-transition-error'

test.group('MissionRunStep entity', () => {
  test('creates a run step as PENDING', ({ assert }) => {
    const stepId = MissionStepId.generate()
    const runStep = MissionRunStep.create(stepId)

    assert.isTrue(runStep.stepId.equals(stepId))
    assert.equal(runStep.status, MissionStepStatus.PENDING)
  })

  test('completes a pending run step', ({ assert }) => {
    const runStep = MissionRunStep.create(MissionStepId.generate())
    runStep.complete()
    assert.equal(runStep.status, MissionStepStatus.COMPLETED)
  })

  test('fails a pending run step', ({ assert }) => {
    const runStep = MissionRunStep.create(MissionStepId.generate())
    runStep.fail()
    assert.equal(runStep.status, MissionStepStatus.FAILED)
  })

  test('cannot complete a step that is not pending', ({ assert }) => {
    const runStep = MissionRunStep.create(MissionStepId.generate())
    runStep.complete()
    assert.throws(() => runStep.complete(), InvalidMissionStepTransitionError)
  })

  test('rehydrates from stored values', ({ assert }) => {
    const stepId = MissionStepId.generate()
    const runStep = MissionRunStep.create(stepId)

    const rehydrated = MissionRunStep.rehydrate(runStep.id.value, stepId.value, MissionStepStatus.COMPLETED)

    assert.isTrue(rehydrated.id.equals(runStep.id))
    assert.equal(rehydrated.status, MissionStepStatus.COMPLETED)
  })
})
