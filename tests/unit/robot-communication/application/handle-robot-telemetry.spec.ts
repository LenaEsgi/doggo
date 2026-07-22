import { test } from '@japa/runner'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake-robot-dog-repository'
import { HandleRobotTelemetryUseCase } from '#app/modules/robot-communication/application/use-cases/handle-robot-telemetry.use-case'

test.group('HandleRobotTelemetryUseCase', (group) => {
  let dogRepository: FakeRobotDogRepository
  let useCase: HandleRobotTelemetryUseCase

  group.each.setup(() => {
    dogRepository = new FakeRobotDogRepository()
    useCase = new HandleRobotTelemetryUseCase(dogRepository)
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
})
