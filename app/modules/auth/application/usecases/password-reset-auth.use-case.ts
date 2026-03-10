import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { type PasswordResetDto } from '#auth/application/dto/password-reset.dto'
import { PasswordResetAuthProvider } from '#auth/domain/contracts/password.reset.auth.provider'

@inject()
export class PasswordResetAuthUseCase {
  constructor(private readonly authProvider: PasswordResetAuthProvider) {}

  async execute(payload: PasswordResetDto): Promise<void> {
    logger.info({ email: payload.email }, 'PasswordResetAuthUseCase started')
    await this.authProvider.sendPasswordResetEmail(payload.email)
    logger.info({ email: payload.email }, 'PasswordResetAuthUseCase completed successfully')
  }
}
