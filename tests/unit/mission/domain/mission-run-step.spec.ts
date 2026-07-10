import { test } from '@japa/runner'
import MissionRunStep from '#app/modules/missions/domain/entities/mission-run-step.entity'
import { MissionStepId } from '#app/modules/missions/domain/value-objects/mission-step-id'
import { MissionStepStatus } from '#app/modules/missions/domain/enums/mission-step-status'

test.group('MissionRunStep entity', () => {
  test('creates a run step as PENDING with its order', ({ assert }) => {
    const stepId = MissionStepId.generate()
    const runStep = MissionRunStep.create(stepId, 2)

    assert.isTrue(runStep.stepId.equals(stepId))
    assert.equal(runStep.status, MissionStepStatus.PENDING)
    assert.equal(runStep.order, 2)
  })

  test('completes a pending run step', ({ assert }) => {
    const runStep = MissionRunStep.create(MissionStepId.generate(), 1)
    runStep.complete()
    assert.equal(runStep.status, MissionStepStatus.COMPLETED)
  })

  test('fails a pending run step', ({ assert }) => {
    const runStep = MissionRunStep.create(MissionStepId.generate(), 1)
    runStep.fail()
    assert.equal(runStep.status, MissionStepStatus.FAILED)
  })

  test('complete() est idempotent : un second appel est un no-op', ({ assert }) => {
    const runStep = MissionRunStep.create(MissionStepId.generate(), 1)
    runStep.complete()
    runStep.complete()
    assert.equal(runStep.status, MissionStepStatus.COMPLETED)
  })

  test('fail() est idempotent : ne modifie pas une étape déjà COMPLETED', ({ assert }) => {
    const runStep = MissionRunStep.create(MissionStepId.generate(), 1)
    runStep.complete()
    runStep.fail()
    assert.equal(runStep.status, MissionStepStatus.COMPLETED)
  })

  test('rehydrates from stored values including order', ({ assert }) => {
    const stepId = MissionStepId.generate()
    const runStep = MissionRunStep.create(stepId, 3)

    const rehydrated = MissionRunStep.rehydrate(
      runStep.id.value,
      stepId.value,
      MissionStepStatus.COMPLETED,
      3
    )

    assert.isTrue(rehydrated.id.equals(runStep.id))
    assert.equal(rehydrated.status, MissionStepStatus.COMPLETED)
    assert.equal(rehydrated.order, 3)
  })
})
