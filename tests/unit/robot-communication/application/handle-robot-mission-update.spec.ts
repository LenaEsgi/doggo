import { test } from '@japa/runner'
import { FakeMissionRepository } from '#tests/unit/fakes/fake-mission-repository'
import { FakeMissionRunRepository } from '#tests/unit/fakes/fake-mission-run-repository'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake-robot-dog-repository'
import { FakeUnitOfWork } from '#tests/unit/fakes/fake-unit-of-work'
import { HandleRobotMissionUpdateUseCase } from '#app/modules/robot-communication/application/use-cases/handle-robot-mission-update.use-case'
import Mission from '#app/modules/missions/domain/entities/mission.entity'
import MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { MissionStepStatus } from '#app/modules/missions/domain/enums/mission-step-status'
import { MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'
import emitter from '@adonisjs/core/services/emitter'
import MissionStepUpdatedEvent from '#app/modules/missions/domain/events/mission-step-updated.event'
import MissionCompletedEvent from '#app/modules/missions/domain/events/mission-completed.event'

test.group('HandleRobotMissionUpdateUseCase', (group) => {
  let missionRepo: FakeMissionRepository
  let runRepo: FakeMissionRunRepository
  let dogRepo: FakeRobotDogRepository
  let uow: FakeUnitOfWork
  let useCase: HandleRobotMissionUpdateUseCase
  let events: ReturnType<typeof emitter.fake>

  group.each.setup(() => {
    missionRepo = new FakeMissionRepository()
    runRepo = new FakeMissionRunRepository()
    dogRepo = new FakeRobotDogRepository()
    uow = new FakeUnitOfWork()
    useCase = new HandleRobotMissionUpdateUseCase(missionRepo, runRepo, dogRepo, uow)
    events = emitter.fake()
    return () => emitter.restore()
  })

  test('complète le step du run actif de ce robot et termine le run quand tous les steps sont faits', async ({
    assert,
  }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    dog.applyStateFromRobot(RobotDogState.IN_MISSION)
    await dogRepo.save(dog)

    const mission = Mission.create('Patrol', 'user-1')
    mission.addStep('action-1', 'p1')
    await missionRepo.save(mission)

    const stepId = mission.missionSteps[0].id
    const run = MissionRun.start(mission.id, dog.id, [stepId])
    run.confirm()
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
    dogA.applyStateFromRobot(RobotDogState.IN_MISSION)
    await dogRepo.save(dogA)
    const dogB = RobotDog.create('SN-B', 'Fido', 80)
    dogB.applyStateFromRobot(RobotDogState.IN_MISSION)
    await dogRepo.save(dogB)

    const mission = Mission.create('Patrol', 'user-1')
    mission.addStep('action-1', 'p1')
    await missionRepo.save(mission)
    const stepId = mission.missionSteps[0].id

    const runA = MissionRun.start(mission.id, dogA.id, [stepId])
    runA.confirm()
    await runRepo.save(runA)
    const runB = MissionRun.start(mission.id, dogB.id, [stepId])
    runB.confirm()
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

  test('COMPLETED sur une étape comble les trous et émet un event par étape complétée', async ({
    assert,
  }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    dog.applyStateFromRobot(RobotDogState.IN_MISSION)
    await dogRepo.save(dog)

    const mission = Mission.create('Patrol', 'user-1')
    mission.addStep('action-1', 'p1')
    mission.addStep('action-2', 'p2')
    mission.addStep('action-3', 'p3')
    await missionRepo.save(mission)

    const stepIds = mission.getStepsInOrder().map((s) => s.id)
    const run = MissionRun.start(mission.id, dog.id, stepIds)
    run.confirm()
    await runRepo.save(run)

    await useCase.execute(dog.id.value, {
      missionId: mission.id.value,
      stepId: stepIds[2].value,
      status: MissionStepStatus.COMPLETED,
    })

    const saved = runRepo.runs.find((r) => r.id.equals(run.id))!
    assert.equal(saved.status, MissionRunStatus.SUCCESS)
    assert.isTrue(saved.runSteps.every((s) => s.status === MissionStepStatus.COMPLETED))

    events.assertEmittedCount(MissionStepUpdatedEvent, 3)
  })

  test('FAILED comble les précédentes en COMPLETED puis émet le FAILED de la cible', async ({
    assert,
  }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    dog.applyStateFromRobot(RobotDogState.IN_MISSION)
    await dogRepo.save(dog)

    const mission = Mission.create('Patrol', 'user-1')
    mission.addStep('action-1', 'p1')
    mission.addStep('action-2', 'p2')
    mission.addStep('action-3', 'p3')
    await missionRepo.save(mission)

    const stepIds = mission.getStepsInOrder().map((s) => s.id)
    const run = MissionRun.start(mission.id, dog.id, stepIds)
    run.confirm()
    await runRepo.save(run)

    await useCase.execute(dog.id.value, {
      missionId: mission.id.value,
      stepId: stepIds[2].value,
      status: MissionStepStatus.FAILED,
    })

    const saved = runRepo.runs.find((r) => r.id.equals(run.id))!
    assert.equal(saved.status, MissionRunStatus.FAILED)

    events.assertEmittedCount(MissionStepUpdatedEvent, 3)
    events.assertEmitted(
      MissionStepUpdatedEvent,
      ({ data }) => data.stepId === stepIds[2].value && data.stepStatus === MissionStepStatus.FAILED
    )
  })

  test("un COMPLETED en doublon (run RUNNING) n'émet aucun event", async () => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    dog.applyStateFromRobot(RobotDogState.IN_MISSION)
    await dogRepo.save(dog)

    const mission = Mission.create('Patrol', 'user-1')
    mission.addStep('action-1', 'p1')
    mission.addStep('action-2', 'p2')
    await missionRepo.save(mission)

    const stepIds = mission.getStepsInOrder().map((s) => s.id)
    const run = MissionRun.start(mission.id, dog.id, stepIds)
    run.confirm()
    run.completeStep(stepIds[0]) // étape 1 déjà COMPLETED (mutation domaine, sans event)
    await runRepo.save(run)

    await useCase.execute(dog.id.value, {
      missionId: mission.id.value,
      stepId: stepIds[0].value,
      status: MissionStepStatus.COMPLETED,
    })

    events.assertEmittedCount(MissionStepUpdatedEvent, 0)
  })

  test("un doublon MQTT périmé (COMPLETED) arrivant après un run déjà terminé (FAILED) ne le ressuscite pas et n'émet qu'un seul MissionCompletedEvent", async ({
    assert,
  }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    dog.applyStateFromRobot(RobotDogState.IN_MISSION)
    await dogRepo.save(dog)

    const mission = Mission.create('Patrol', 'user-1')
    mission.addStep('action-1', 'p1')
    mission.addStep('action-2', 'p2')
    mission.addStep('action-3', 'p3')
    mission.addStep('action-4', 'p4')
    await missionRepo.save(mission)

    const stepIds = mission.getStepsInOrder().map((s) => s.id)
    const run = MissionRun.start(mission.id, dog.id, stepIds)
    run.confirm()
    await runRepo.save(run)

    // Le step 4 échoue : le run passe à FAILED (terminal), un seul MissionCompletedEvent part.
    await useCase.execute(dog.id.value, {
      missionId: mission.id.value,
      stepId: stepIds[3].value,
      status: MissionStepStatus.FAILED,
    })

    const afterFailure = runRepo.runs.find((r) => r.id.equals(run.id))!
    assert.equal(afterFailure.status, MissionRunStatus.FAILED)
    events.assertEmittedCount(MissionCompletedEvent, 1)

    // Doublon MQTT périmé : un COMPLETED du step 2 arrive après coup (retry / désordre réseau).
    await useCase.execute(dog.id.value, {
      missionId: mission.id.value,
      stepId: stepIds[1].value,
      status: MissionStepStatus.COMPLETED,
    })

    const afterDuplicate = runRepo.runs.find((r) => r.id.equals(run.id))!
    assert.equal(afterDuplicate.status, MissionRunStatus.FAILED)
    assert.notEqual(afterDuplicate.status, MissionRunStatus.RUNNING)
    events.assertEmittedCount(MissionCompletedEvent, 1)
  })
})
