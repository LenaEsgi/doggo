import { inject } from '@adonisjs/core'
import { PasswordResetAuthService } from '#auth/application/contracts/password.reset.auth.service'
import type { PasswordResetDto } from '#auth/application/dto/password_reset.dto'
import { PasswordResetAuthProvider } from '#auth/domain/contracts/password.reset.auth.provider'

@inject()
export class PasswordResetAuth implements PasswordResetAuthService {
  constructor(private readonly authProvider: PasswordResetAuthProvider) {}

  async sendPasswordReset(payload: PasswordResetDto): Promise<void> {
    await this.authProvider.sendPasswordResetEmail(payload.email)
  }
}
