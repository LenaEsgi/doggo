import { test } from '@japa/runner'
import emitter from '@adonisjs/core/services/emitter'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake-robot-dog-repository'
import { HandleRobotTelemetryUseCase } from '#app/modules/robot-communication/application/use-cases/handle-robot-telemetry.use-case'
import RobotBatteryLowEvent from '#dogs/domain/events/robot-battery-low.event'
import RobotTelemetryReceivedEvent from '#dogs/domain/events/robot-telemetry-received.event'

test.group('HandleRobotTelemetryUseCase', (group) => {
  let dogRepo: FakeRobotDogRepository
  let useCase: HandleRobotTelemetryUseCase
  let events: ReturnType<typeof emitter.fake>

  group.each.setup(() => {
    dogRepo = new FakeRobotDogRepository()
    useCase = new HandleRobotTelemetryUseCase(dogRepo)
    events = emitter.fake()
    return () => emitter.restore()
  })

  test('émet RobotBatteryLowEvent quand la batterie franchit le seuil bas (pas encore critique)', async () => {
    const dog = RobotDog.create('SN-001', 'Rex', 30)
    await dogRepo.save(dog)

    await useCase.execute(dog.id.value, { battery: 18 })

    events.assertEmitted(
      RobotBatteryLowEvent,
      ({ data }) =>
        data.robotDogId === dog.id.value && data.robotDogName === 'Rex' && data.batteryLevel === 18
    )
  })

  test("n'émet rien si la batterie était déjà sous le seuil (pas de spam à chaque télémétrie)", async () => {
    const dog = RobotDog.create('SN-001', 'Rex', 18)
    await dogRepo.save(dog)

    await useCase.execute(dog.id.value, { battery: 15 })

    events.assertEmittedCount(RobotBatteryLowEvent, 0)
  })

  test("n'émet rien si la batterie descend directement en zone critique", async () => {
    const dog = RobotDog.create('SN-001', 'Rex', 30)
    await dogRepo.save(dog)

    await useCase.execute(dog.id.value, { battery: 5 })

    events.assertEmittedCount(RobotBatteryLowEvent, 0)
  })

  test("n'émet rien si la batterie reste au-dessus du seuil", async () => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await dogRepo.save(dog)

    await useCase.execute(dog.id.value, { battery: 75 })

    events.assertEmittedCount(RobotBatteryLowEvent, 0)
  })

  test('émet toujours RobotTelemetryReceivedEvent', async () => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await dogRepo.save(dog)

    await useCase.execute(dog.id.value, { battery: 75 })

    events.assertEmitted(RobotTelemetryReceivedEvent)
  })
})
