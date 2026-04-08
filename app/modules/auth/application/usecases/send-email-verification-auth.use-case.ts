import { inject } from '@adonisjs/core'
import { SendEmailVerificationAuthProvider } from '#auth/domain/contracts/send.email.verification.auth.provider'
import type { SendEmailVerificationDto } from '#auth/application/dto/send-email-verification.dto'

@inject()
export class SendEmailVerificationAuthUseCase {
  constructor(private readonly provider: SendEmailVerificationAuthProvider) {}

  async execute(dto: SendEmailVerificationDto): Promise<void> {
    await this.provider.sendEmailVerification(dto.idToken)
  }
}
