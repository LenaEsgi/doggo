import { test } from '@japa/runner'
import emitter from '@adonisjs/core/services/emitter'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake-robot-dog-repository'
import { HandleRobotTelemetryUseCase } from '#app/modules/robot-communication/application/use-cases/handle-robot-telemetry.use-case'
import RobotBatteryLowEvent from '#dogs/domain/events/robot-battery-low.event'
import RobotTelemetryReceivedEvent from '#dogs/domain/events/robot-telemetry-received.event'

test.group('HandleRobotTelemetryUseCase', (group) => {
  let dogRepository: FakeRobotDogRepository
  let useCase: HandleRobotTelemetryUseCase
  let events: ReturnType<typeof emitter.fake>

  group.each.setup(() => {
    dogRepository = new FakeRobotDogRepository()
    useCase = new HandleRobotTelemetryUseCase(dogRepository)
    events = emitter.fake()
    return () => emitter.restore()
  })

  test('met à jour la batterie et le heartbeat', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 50)
    dogRepository.storedDogs.push(dog)

    await useCase.execute(dog.id.value, { battery: 77 })

    const saved = await dogRepository.findById(dog.id)
    assert.equal(saved!.batteryLevel, 77)
  })

  test('ne touche pas au state si le robot est déjà IDLE', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 50)
    dogRepository.storedDogs.push(dog)

    await useCase.execute(dog.id.value, { battery: 60 })

    const saved = await dogRepository.findById(dog.id)
    assert.equal(saved!.state, RobotDogState.IDLE)
  })

  test('restaure le robot OFFLINE à IDLE quand la télémétrie reprend', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 50)
    dog.markOffline()
    dogRepository.storedDogs.push(dog)

    await useCase.execute(dog.id.value, { battery: 42 })

    const saved = await dogRepository.findById(dog.id)
    assert.equal(saved!.state, RobotDogState.IDLE)
    assert.equal(saved!.batteryLevel, 42)
  })

  test('ignore silencieusement un robot inconnu', async ({ assert }) => {
    await useCase.execute('00000000-0000-4000-8000-000000000099', { battery: 10 })
    assert.isTrue(true)
  })

  test('émet RobotBatteryLowEvent quand la batterie franchit le seuil bas (pas encore critique)', async () => {
    const dog = RobotDog.create('SN-001', 'Rex', 30)
    await dogRepository.save(dog)

    await useCase.execute(dog.id.value, { battery: 18 })

    events.assertEmitted(
      RobotBatteryLowEvent,
      ({ data }) =>
        data.robotDogId === dog.id.value && data.robotDogName === 'Rex' && data.batteryLevel === 18
    )
  })

  test("n'émet rien si la batterie était déjà sous le seuil (pas de spam à chaque télémétrie)", async () => {
    const dog = RobotDog.create('SN-001', 'Rex', 18)
    await dogRepository.save(dog)

    await useCase.execute(dog.id.value, { battery: 15 })

    events.assertEmittedCount(RobotBatteryLowEvent, 0)
  })

  test("n'émet rien si la batterie descend directement en zone critique", async () => {
    const dog = RobotDog.create('SN-001', 'Rex', 30)
    await dogRepository.save(dog)

    await useCase.execute(dog.id.value, { battery: 5 })

    events.assertEmittedCount(RobotBatteryLowEvent, 0)
  })

  test("n'émet rien si la batterie reste au-dessus du seuil", async () => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await dogRepository.save(dog)

    await useCase.execute(dog.id.value, { battery: 75 })

    events.assertEmittedCount(RobotBatteryLowEvent, 0)
  })

  test('émet toujours RobotTelemetryReceivedEvent', async () => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await dogRepository.save(dog)

    await useCase.execute(dog.id.value, { battery: 75 })

    events.assertEmitted(RobotTelemetryReceivedEvent)
  })
})
