import { test } from '@japa/runner'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake-robot-dog-repository'
import { FakeMissionRunRepository } from '#tests/unit/fakes/fake-mission-run-repository'
import { HandlePendingRunTimeoutUseCase } from '#app/modules/robot-communication/application/use-cases/handle-pending-run-timeout.use-case'
import MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { MissionStepId } from '#app/modules/missions/domain/value-objects/mission-step-id'
import { MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'

test.group('HandlePendingRunTimeoutUseCase', (group) => {
  let runRepo: FakeMissionRunRepository
  let dogRepo: FakeRobotDogRepository
  let useCase: HandlePendingRunTimeoutUseCase

  group.each.setup(() => {
    runRepo = new FakeMissionRunRepository()
    dogRepo = new FakeRobotDogRepository()
    useCase = new HandlePendingRunTimeoutUseCase(runRepo, dogRepo)
  })

  test('interrompt le run PENDING et repasse le dog IDLE quand le robot ne confirme jamais', async ({
    assert,
  }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    dog.applyStateFromRobot(RobotDogState.IN_MISSION)
    await dogRepo.save(dog)
    assert.equal(dog.state, RobotDogState.IN_MISSION)

    const run = MissionRun.start(MissionId.generate(), dog.id, [MissionStepId.generate()])
    await runRepo.save(run)

    await useCase.execute(run.id.value, dog.id.value)

    const saved = runRepo.runs.find((r) => r.id.equals(run.id))!
    assert.equal(saved.status, MissionRunStatus.INTERRUPTED)

    const savedDog = await dogRepo.findById(dog.id)
    assert.equal(savedDog!.state, RobotDogState.IDLE)
  })

  test('ne touche pas à un run déjà confirmé (RUNNING)', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    dog.applyStateFromRobot(RobotDogState.IN_MISSION)
    await dogRepo.save(dog)

    const run = MissionRun.start(MissionId.generate(), dog.id, [MissionStepId.generate()])
    run.confirm()
    await runRepo.save(run)

    await useCase.execute(run.id.value, dog.id.value)

    const saved = runRepo.runs.find((r) => r.id.equals(run.id))!
    assert.equal(saved.status, MissionRunStatus.RUNNING)
    assert.equal(dog.state, RobotDogState.IN_MISSION)
  })

  test('ne touche pas au run actif si son id ne correspond pas (job périmé)', async ({
    assert,
  }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await dogRepo.save(dog)

    const currentRun = MissionRun.start(MissionId.generate(), dog.id, [MissionStepId.generate()])
    await runRepo.save(currentRun)

    await useCase.execute('00000000-0000-0000-0000-000000000000', dog.id.value)

    const saved = runRepo.runs.find((r) => r.id.equals(currentRun.id))!
    assert.equal(saved.status, MissionRunStatus.PENDING)
  })

  test('ne plante pas si aucun run actif pour ce robot', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await dogRepo.save(dog)

    await useCase.execute('00000000-0000-0000-0000-000000000000', dog.id.value)

    assert.lengthOf(runRepo.runs, 0)
  })
})
