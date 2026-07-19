import type { ApplicationService } from '@adonisjs/core/types'
import { UnitOfWork } from '#app/modules/share/domain/contracts/unit-of-work'
import { LucidUnitOfWork } from '#app/modules/share/infrastructure/database/lucid-unit-of-work'

export default class AppProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.singleton(UnitOfWork, () => new LucidUnitOfWork())
  }
}
