import { test } from '@japa/runner'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake-robot-dog-repository'
import { FakeRobotCommunicationService } from '#tests/unit/fakes/fake-robot-communication-service'
import { FakeMissionRunRepository } from '#tests/unit/fakes/fake-mission-run-repository'
import { StopMissionCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/stop-mission.use-case'
import { RobotCommand } from '#app/modules/robot-communication/domain/types/robot-command.type'
import { NoActiveMissionRunError } from '#app/modules/missions/domain/exceptions/no-active-mission-run.error'
import MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { MissionStepId } from '#app/modules/missions/domain/value-objects/mission-step-id'

test.group('StopMissionCommandUseCase', (group) => {
  let fakeRepo: FakeRobotDogRepository
  let fakeMqtt: FakeRobotCommunicationService
  let runRepo: FakeMissionRunRepository
  let useCase: StopMissionCommandUseCase

  group.each.setup(() => {
    fakeRepo = new FakeRobotDogRepository()
    fakeMqtt = new FakeRobotCommunicationService()
    runRepo = new FakeMissionRunRepository()
    useCase = new StopMissionCommandUseCase(fakeRepo, fakeMqtt, runRepo)
  })

  test('exposes RobotCommand.STOP_MISSION as its command', ({ assert }) => {
    assert.equal(useCase.command, RobotCommand.STOP_MISSION)
  })

  test('interrompt le run actif du robot', async ({ assert }) => {
    let dog = RobotDog.create('SN-001', 'Rex', 80)
    dog.startMission()
    await fakeRepo.save(dog)

    const run = MissionRun.start(MissionId.generate(), dog.id, [MissionStepId.generate()])
    await runRepo.save(run)

    await useCase.execute(dog.id.value)

    const found = await runRepo.findActiveRunByRobotDog(dog.id.value)
    assert.isNull(found)
    assert.lengthOf(fakeMqtt.calls, 1)
    assert.equal(fakeMqtt.calls[0].command, RobotCommand.STOP_MISSION)
  })

  test("refuse si le robot n'a aucun run actif", async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    await assert.rejects(() => useCase.execute(dog.id.value), NoActiveMissionRunError)
    assert.lengthOf(fakeMqtt.calls, 0)
  })

  test('ne persiste rien si la publication MQTT échoue', async ({ assert }) => {
    let dog = RobotDog.create('SN-001', 'Rex', 80)
    dog.startMission()
    await fakeRepo.save(dog)

    const run = MissionRun.start(MissionId.generate(), dog.id, [MissionStepId.generate()])
    await runRepo.save(run)
    fakeMqtt.shouldFail = true

    await assert.rejects(() => useCase.execute(dog.id.value))

    const found = await runRepo.findActiveRunByRobotDog(dog.id.value)
    assert.isNotNull(found)
    assert.equal(found!.status, 'RUNNING')
  })
})
