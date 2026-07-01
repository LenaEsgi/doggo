import { test } from '@japa/runner'
import { FakeMissionRunRepository } from '#tests/unit/fakes/fake-mission-run-repository'
import MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { MissionStepId } from '#app/modules/missions/domain/value-objects/mission-step-id'

test.group('FakeMissionRunRepository', () => {
  test('findActiveRun only returns a RUNNING run for the given mission and robot', async ({ assert }) => {
    const repo = new FakeMissionRunRepository()
    const missionId = MissionId.generate()
    const robotDogId = RobotDogId.generate()
    const run = MissionRun.start(missionId, robotDogId, [MissionStepId.generate()])
    await repo.save(run)

    const found = await repo.findActiveRun(missionId.value, robotDogId.value)
    assert.isNotNull(found)
    assert.isTrue(found!.id.equals(run.id))

    assert.isNull(await repo.findActiveRun(MissionId.generate().value, robotDogId.value))
  })

  test('hasActiveRunForMission is true only while a run is RUNNING', async ({ assert }) => {
    const repo = new FakeMissionRunRepository()
    const missionId = MissionId.generate()
    const stepId = MissionStepId.generate()
    const run = MissionRun.start(missionId, RobotDogId.generate(), [stepId])
    await repo.save(run)

    assert.isTrue(await repo.hasActiveRunForMission(missionId.value))

    run.completeStep(stepId)
    await repo.save(run)

    assert.isFalse(await repo.hasActiveRunForMission(missionId.value))
  })

  test('findActiveRunByRobotDog ignores mission id', async ({ assert }) => {
    const repo = new FakeMissionRunRepository()
    const robotDogId = RobotDogId.generate()
    const run = MissionRun.start(MissionId.generate(), robotDogId, [MissionStepId.generate()])
    await repo.save(run)

    const found = await repo.findActiveRunByRobotDog(robotDogId.value)
    assert.isNotNull(found)
    assert.isTrue(found!.id.equals(run.id))
  })
})
