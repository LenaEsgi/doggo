import { test } from '@japa/runner'
import { FakeMissionRepository } from '#tests/unit/fakes/fake-mission-repository'
import { FakeMissionRunRepository } from '#tests/unit/fakes/fake-mission-run-repository'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake-robot-dog-repository'
import { HandleRobotMissionUpdateUseCase } from '#app/modules/robot-communication/application/use-cases/handle-robot-mission-update.use-case'
import Mission from '#app/modules/missions/domain/entities/mission.entity'
import MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { MissionStepStatus } from '#app/modules/missions/domain/enums/mission-step-status'
import { MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'

test.group('HandleRobotMissionUpdateUseCase', (group) => {
  let missionRepo: FakeMissionRepository
  let runRepo: FakeMissionRunRepository
  let dogRepo: FakeRobotDogRepository
  let useCase: HandleRobotMissionUpdateUseCase

  group.each.setup(() => {
    missionRepo = new FakeMissionRepository()
    runRepo = new FakeMissionRunRepository()
    dogRepo = new FakeRobotDogRepository()
    useCase = new HandleRobotMissionUpdateUseCase(missionRepo, runRepo, dogRepo)
  })

  test('complète le step du run actif de ce robot et termine le run quand tous les steps sont faits', async ({
    assert,
  }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    dog.startMission()
    await dogRepo.save(dog)

    const mission = Mission.create('Patrol', 'user-1')
    mission.addStep('action-1', 'p1')
    await missionRepo.save(mission)

    const stepId = mission.missionSteps[0].id
    const run = MissionRun.start(mission.id, dog.id, [stepId])
    await runRepo.save(run)

    await useCase.execute(dog.id.value, {
      missionId: mission.id.value,
      stepId: stepId.value,
      status: MissionStepStatus.COMPLETED,
    })

    const updatedRun = await runRepo.findActiveRun(mission.id.value, dog.id.value)
    assert.isNull(updatedRun)

    const savedRun = runRepo.runs.find((r) => r.id.equals(run.id))!
    assert.equal(savedRun.status, MissionRunStatus.SUCCESS)

    const savedDog = await dogRepo.findById(dog.id)
    assert.notEqual(savedDog!.state, 'IN_MISSION')
  })

  test("ignore silencieusement si aucun run actif n'existe pour ce robot", async ({ assert }) => {
    const mission = Mission.create('Patrol', 'user-1')
    mission.addStep('action-1', 'p1')
    await missionRepo.save(mission)
    const stepId = mission.missionSteps[0].id

    await useCase.execute('unknown-dog-id', {
      missionId: mission.id.value,
      stepId: stepId.value,
      status: MissionStepStatus.COMPLETED,
    })

    assert.lengthOf(runRepo.runs, 0)
  })

  test('un step FAILED fait échouer le run et ne touche pas les autres robots sur la même mission', async ({
    assert,
  }) => {
    const dogA = RobotDog.create('SN-A', 'Rex', 80)
    dogA.startMission()
    await dogRepo.save(dogA)
    const dogB = RobotDog.create('SN-B', 'Fido', 80)
    dogB.startMission()
    await dogRepo.save(dogB)

    const mission = Mission.create('Patrol', 'user-1')
    mission.addStep('action-1', 'p1')
    await missionRepo.save(mission)
    const stepId = mission.missionSteps[0].id

    const runA = MissionRun.start(mission.id, dogA.id, [stepId])
    await runRepo.save(runA)
    const runB = MissionRun.start(mission.id, dogB.id, [stepId])
    await runRepo.save(runB)

    await useCase.execute(dogA.id.value, {
      missionId: mission.id.value,
      stepId: stepId.value,
      status: MissionStepStatus.FAILED,
    })

    const savedRunA = runRepo.runs.find((r) => r.id.equals(runA.id))!
    assert.equal(savedRunA.status, MissionRunStatus.FAILED)

    const stillActiveRunB = await runRepo.findActiveRun(mission.id.value, dogB.id.value)
    assert.isNotNull(stillActiveRunB)
  })
})
