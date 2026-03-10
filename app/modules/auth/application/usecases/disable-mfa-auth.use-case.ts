import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { type DisableMfaDto } from '#auth/application/dto/disable-mfa.dto'
import { DisableMfaAuthProvider } from '#auth/domain/contracts/disable.mfa.auth.provider'
import { type DisableMfaResult } from '#auth/domain/types/disable.mfa.result'

@inject()
export class DisableMfaAuthUseCase {
  constructor(private readonly authProvider: DisableMfaAuthProvider) {}

  async execute(payload: DisableMfaDto): Promise<DisableMfaResult> {
    logger.info({ mfaEnrollmentId: payload.mfaEnrollmentId }, 'DisableMfaAuthUseCase started')
    const result = await this.authProvider.disableMfa(payload.idToken, payload.mfaEnrollmentId)
    logger.info(
      { mfaEnrollmentId: payload.mfaEnrollmentId },
      'DisableMfaAuthUseCase completed successfully'
    )
    return result
  }
}
