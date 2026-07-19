import { test } from '@japa/runner'
import { FakeMissionRunRepository } from '#tests/unit/fakes/fake-mission-run-repository'
import MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { MissionStepId } from '#app/modules/missions/domain/value-objects/mission-step-id'
import type { Tx } from '#app/modules/share/domain/contracts/unit-of-work'

test.group('FakeMissionRunRepository', () => {
  test('findActiveRun only returns a RUNNING run for the given mission and robot', async ({
    assert,
  }) => {
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

    run.confirm()
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

  test('listActiveRuns returns only PENDING/RUNNING runs across all missions and robots', async ({
    assert,
  }) => {
    const repo = new FakeMissionRunRepository()

    const pendingRun = MissionRun.start(MissionId.generate(), RobotDogId.generate(), [
      MissionStepId.generate(),
    ])
    const runningRun = MissionRun.start(MissionId.generate(), RobotDogId.generate(), [
      MissionStepId.generate(),
    ])
    runningRun.confirm()
    const completedStepId = MissionStepId.generate()
    const completedRun = MissionRun.start(MissionId.generate(), RobotDogId.generate(), [
      completedStepId,
    ])
    completedRun.confirm()
    completedRun.completeStep(completedStepId)

    await repo.save(pendingRun)
    await repo.save(runningRun)
    await repo.save(completedRun)

    const result = await repo.listActiveRuns()

    assert.lengthOf(result, 2)
    const ids = result.map((r) => r.id.value)
    assert.includeMembers(ids, [pendingRun.id.value, runningRun.id.value])
    assert.notInclude(ids, completedRun.id.value)
  })

  test('findActiveRunByRobotDogForUpdate delegates to findActiveRunByRobotDog', async ({
    assert,
  }) => {
    const repo = new FakeMissionRunRepository()
    const robotDogId = RobotDogId.generate()
    const run = MissionRun.start(MissionId.generate(), robotDogId, [MissionStepId.generate()])
    await repo.save(run)

    const found = await repo.findActiveRunByRobotDogForUpdate(robotDogId.value, {} as Tx)
    assert.isNotNull(found)
    assert.isTrue(found!.id.equals(run.id))

    const notFound = await repo.findActiveRunByRobotDogForUpdate(
      RobotDogId.generate().value,
      {} as Tx
    )
    assert.isNull(notFound)
  })
})
