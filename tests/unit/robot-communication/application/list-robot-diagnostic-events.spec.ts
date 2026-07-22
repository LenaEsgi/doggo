import { test } from '@japa/runner'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake-robot-dog-repository'
import { FakeRobotDiagnosticEventRepository } from '#tests/unit/fakes/fake-robot-diagnostic-event-repository'
import { ListRobotDiagnosticEventsUseCase } from '#app/modules/robot-communication/application/use-cases/list-robot-diagnostic-events.use-case'
import { RobotDiagnosticEvent } from '#app/modules/robot-communication/domain/entities/robot-diagnostic-event.entity'
import { RobotBootReason } from '#app/modules/robot-communication/domain/enums/robot-boot-reason'

test.group('ListRobotDiagnosticEventsUseCase', () => {
  test('associe le nom du robot à chaque événement', async ({ assert }) => {
    const dogRepo = new FakeRobotDogRepository()
    const diagnosticRepo = new FakeRobotDiagnosticEventRepository()
    const useCase = new ListRobotDiagnosticEventsUseCase(diagnosticRepo, dogRepo)

    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await dogRepo.save(dog)
    await diagnosticRepo.save(
      RobotDiagnosticEvent.fromReboot(dog.id.value, {
        firmwareVersion: '1.0.0',
        bootReason: RobotBootReason.POWER_ON,
      })
    )

    const result = await useCase.execute({})

    assert.equal(result.data.length, 1)
    assert.equal(result.data[0].dogName, 'Rex')
    assert.equal(result.data[0].event.dogId, dog.id.value)
  })

  test('utilise un nom de repli si le robot a disparu', async ({ assert }) => {
    const dogRepo = new FakeRobotDogRepository()
    const diagnosticRepo = new FakeRobotDiagnosticEventRepository()
    const useCase = new ListRobotDiagnosticEventsUseCase(diagnosticRepo, dogRepo)

    await diagnosticRepo.save(
      RobotDiagnosticEvent.fromReboot('00000000-0000-4000-8000-000000000000', {
        firmwareVersion: '1.0.0',
        bootReason: RobotBootReason.POWER_ON,
      })
    )

    const result = await useCase.execute({})

    assert.equal(result.data[0].dogName, 'Unknown robot')
  })
})
