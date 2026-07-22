import type { ApplicationService } from '@adonisjs/core/types'
import { RobotDiagnosticEventRepository } from '#app/modules/robot-communication/domain/contracts/robot-diagnostic-event.repository'
import { RobotDiagnosticEventRepositoryImplementation } from '#app/modules/robot-communication/infrastructure/database/repositories/robot-diagnostic-event.repository.implementation'

export default class RobotDiagnosticProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.bind(RobotDiagnosticEventRepository, () => {
      return this.app.container.make(RobotDiagnosticEventRepositoryImplementation)
    })
  }

  async boot() {}
  async start() {}
  async ready() {}
  async shutdown() {}
}
