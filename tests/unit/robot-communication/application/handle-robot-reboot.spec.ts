import { test } from '@japa/runner'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake-robot-dog-repository'
import { FakeRobotDiagnosticEventRepository } from '#tests/unit/fakes/fake-robot-diagnostic-event-repository'
import { HandleRobotRebootUseCase } from '#app/modules/robot-communication/application/use-cases/handle-robot-reboot.use-case'
import { RobotDiagnosticEventType } from '#app/modules/robot-communication/domain/enums/robot-diagnostic-event-type'
import { RobotBootReason } from '#app/modules/robot-communication/domain/enums/robot-boot-reason'

test.group('HandleRobotRebootUseCase', () => {
  test('persiste un événement REBOOT pour un robot connu', async ({ assert }) => {
    const dogRepo = new FakeRobotDogRepository()
    const diagnosticRepo = new FakeRobotDiagnosticEventRepository()
    const useCase = new HandleRobotRebootUseCase(dogRepo, diagnosticRepo)
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await dogRepo.save(dog)

    await useCase.execute(dog.id.value, {
      firmwareVersion: '1.2.3',
      bootReason: RobotBootReason.WATCHDOG_RESET,
    })

    assert.equal(diagnosticRepo.storedEvents.length, 1)
    assert.equal(diagnosticRepo.storedEvents[0].type, RobotDiagnosticEventType.REBOOT)
    assert.equal(diagnosticRepo.storedEvents[0].dogId, dog.id.value)
  })

  test('met à jour le firmwareVersion du robot avec une version valide', async ({ assert }) => {
    const dogRepo = new FakeRobotDogRepository()
    const diagnosticRepo = new FakeRobotDiagnosticEventRepository()
    const useCase = new HandleRobotRebootUseCase(dogRepo, diagnosticRepo)
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await dogRepo.save(dog)

    await useCase.execute(dog.id.value, {
      firmwareVersion: '2.1.0',
      bootReason: RobotBootReason.POWER_ON,
    })

    const updated = await dogRepo.findById(dog.id)
    assert.equal(updated?.firmwareVersion, '2.1.0')
  })

  test('ignore une firmwareVersion malformée sans planter et sans changer la version existante', async ({
    assert,
  }) => {
    const dogRepo = new FakeRobotDogRepository()
    const diagnosticRepo = new FakeRobotDiagnosticEventRepository()
    const useCase = new HandleRobotRebootUseCase(dogRepo, diagnosticRepo)
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    dog.updateFirmwareVersion('1.5.0')
    await dogRepo.save(dog)

    await useCase.execute(dog.id.value, {
      firmwareVersion: 'not-a-version',
      bootReason: RobotBootReason.WATCHDOG_RESET,
    })

    const updated = await dogRepo.findById(dog.id)
    assert.equal(updated?.firmwareVersion, '1.5.0')
  })

  test('ignore silencieusement un robot inconnu', async ({ assert }) => {
    const dogRepo = new FakeRobotDogRepository()
    const diagnosticRepo = new FakeRobotDiagnosticEventRepository()
    const useCase = new HandleRobotRebootUseCase(dogRepo, diagnosticRepo)

    await useCase.execute('00000000-0000-4000-8000-000000000000', {
      firmwareVersion: '1.2.3',
      bootReason: RobotBootReason.POWER_ON,
    })

    assert.equal(diagnosticRepo.storedEvents.length, 0)
  })
})
