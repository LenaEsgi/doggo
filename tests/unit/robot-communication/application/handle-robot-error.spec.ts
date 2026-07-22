import { test } from '@japa/runner'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake-robot-dog-repository'
import { FakeRobotDiagnosticEventRepository } from '#tests/unit/fakes/fake-robot-diagnostic-event-repository'
import { HandleRobotErrorUseCase } from '#app/modules/robot-communication/application/use-cases/handle-robot-error.use-case'
import { RobotDiagnosticEventType } from '#app/modules/robot-communication/domain/enums/robot-diagnostic-event-type'
import { RobotDiagnosticSeverity } from '#app/modules/robot-communication/domain/enums/robot-diagnostic-severity'
import { RobotErrorSeverity } from '#app/modules/robot-communication/domain/enums/robot-error-severity'

test.group('HandleRobotErrorUseCase', () => {
  test('persiste un événement ERROR avec la sévérité critical', async ({ assert }) => {
    const dogRepo = new FakeRobotDogRepository()
    const diagnosticRepo = new FakeRobotDiagnosticEventRepository()
    const useCase = new HandleRobotErrorUseCase(dogRepo, diagnosticRepo)
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await dogRepo.save(dog)

    await useCase.execute(dog.id.value, {
      code: 'MOTOR_STALL',
      component: 'motor_driver',
      message: 'Moteur bloqué',
      severity: RobotErrorSeverity.CRITICAL,
    })

    assert.equal(diagnosticRepo.storedEvents.length, 1)
    assert.equal(diagnosticRepo.storedEvents[0].type, RobotDiagnosticEventType.ERROR)
    assert.equal(diagnosticRepo.storedEvents[0].severity, RobotDiagnosticSeverity.CRITICAL)
  })

  test('ignore silencieusement un robot inconnu', async ({ assert }) => {
    const dogRepo = new FakeRobotDogRepository()
    const diagnosticRepo = new FakeRobotDiagnosticEventRepository()
    const useCase = new HandleRobotErrorUseCase(dogRepo, diagnosticRepo)

    await useCase.execute('00000000-0000-4000-8000-000000000000', {
      code: 'X',
      component: 'y',
      message: 'z',
      severity: RobotErrorSeverity.WARNING,
    })

    assert.equal(diagnosticRepo.storedEvents.length, 0)
  })
})
