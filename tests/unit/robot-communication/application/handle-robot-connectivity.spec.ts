import { test } from '@japa/runner'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake-robot-dog-repository'
import { FakeRobotDiagnosticEventRepository } from '#tests/unit/fakes/fake-robot-diagnostic-event-repository'
import { HandleRobotConnectivityUseCase } from '#app/modules/robot-communication/application/use-cases/handle-robot-connectivity.use-case'
import { RobotDiagnosticEventType } from '#app/modules/robot-communication/domain/enums/robot-diagnostic-event-type'
import { RobotConnectivityStatus } from '#app/modules/robot-communication/domain/enums/robot-connectivity-status'
import { RobotConnectivityReason } from '#app/modules/robot-communication/domain/enums/robot-connectivity-reason'

test.group('HandleRobotConnectivityUseCase', () => {
  test('persiste un événement CONNECTIVITY', async ({ assert }) => {
    const dogRepo = new FakeRobotDogRepository()
    const diagnosticRepo = new FakeRobotDiagnosticEventRepository()
    const useCase = new HandleRobotConnectivityUseCase(dogRepo, diagnosticRepo)
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await dogRepo.save(dog)

    await useCase.execute(dog.id.value, {
      status: RobotConnectivityStatus.DISCONNECTED,
      reason: RobotConnectivityReason.LWT_TIMEOUT,
    })

    assert.equal(diagnosticRepo.storedEvents.length, 1)
    assert.equal(diagnosticRepo.storedEvents[0].type, RobotDiagnosticEventType.CONNECTIVITY)
  })

  test('ignore silencieusement un robot inconnu', async ({ assert }) => {
    const dogRepo = new FakeRobotDogRepository()
    const diagnosticRepo = new FakeRobotDiagnosticEventRepository()
    const useCase = new HandleRobotConnectivityUseCase(dogRepo, diagnosticRepo)

    await useCase.execute('00000000-0000-4000-8000-000000000000', {
      status: RobotConnectivityStatus.CONNECTED,
    })

    assert.equal(diagnosticRepo.storedEvents.length, 0)
  })
})
