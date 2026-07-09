import { test } from '@japa/runner'
import MissionRunTransformer from '#app/modules/missions/infrastructure/http/transformers/mission-run.transformer'
import MissionRunStepTransformer from '#app/modules/missions/infrastructure/http/transformers/mission-run-step.transformer'
import MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'
import MissionRunStep from '#app/modules/missions/domain/entities/mission-run-step.entity'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { MissionStepId } from '#app/modules/missions/domain/value-objects/mission-step-id'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'

test.group('MissionRunStepTransformer', () => {
  test('sérialise un run step en objet plat', ({ assert }) => {
    const step = MissionRunStep.create(MissionStepId.generate())

    const obj = new MissionRunStepTransformer(step).toObject()

    assert.equal(obj.id, step.id.value)
    assert.equal(obj.stepId, step.stepId.value)
    assert.equal(obj.status, step.status)
  })
})

test.group('MissionRunTransformer', () => {
  test('sérialise un run et ses steps', ({ assert }) => {
    const run = MissionRun.start(MissionId.generate(), RobotDogId.generate(), [
      MissionStepId.generate(),
    ])
    run.confirm()

    const obj = new MissionRunTransformer(run).toObject()

    assert.equal(obj.id, run.id.value)
    assert.equal(obj.missionId, run.missionId.value)
    assert.equal(obj.robotDogId, run.robotDogId.value)
    assert.equal(obj.status, MissionRunStatus.RUNNING)
    assert.lengthOf(obj.runSteps, 1)
    assert.equal(obj.runSteps[0].stepId, run.runSteps[0].stepId.value)
  })
})
