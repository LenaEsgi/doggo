import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { type PasswordResetDto } from '#auth/application/dto/password-reset.dto'
import { PasswordResetAuthProvider } from '#auth/domain/contracts/password.reset.auth.provider'
import { maskEmail } from '#app/modules/share/utils/mask-email'

@inject()
export class PasswordResetAuthUseCase {
  constructor(private readonly authProvider: PasswordResetAuthProvider) {}

  async execute(payload: PasswordResetDto): Promise<void> {
    logger.info({ email: maskEmail(payload.email) }, 'PasswordResetAuthUseCase started')
    await this.authProvider.sendPasswordResetEmail(payload.email)
    logger.info(
      { email: maskEmail(payload.email) },
      'PasswordResetAuthUseCase completed successfully'
    )
  }
}
