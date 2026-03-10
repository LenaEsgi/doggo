import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { type FinalizeTotpSetupDto } from '#auth/application/dto/finalize-totp-setup.dto'
import { FinalizeTotpSetupAuthProvider } from '#auth/domain/contracts/finalize.totp.setup.auth.provider'
import { type TotpFinalizeResult } from '#auth/domain/types/totp.finalize.result'

@inject()
export class FinalizeTotpSetupAuthUseCase {
  constructor(private readonly authProvider: FinalizeTotpSetupAuthProvider) {}

  async execute(payload: FinalizeTotpSetupDto): Promise<TotpFinalizeResult> {
    logger.info(
      { hasDisplayName: Boolean(payload.displayName) },
      'FinalizeTotpSetupAuthUseCase started'
    )
    const result = await this.authProvider.finalizeTotpEnrollment(
      payload.idToken,
      payload.sessionInfo,
      payload.verificationCode,
      payload.displayName
    )
    logger.info({}, 'FinalizeTotpSetupAuthUseCase completed successfully')
    return result
  }
}
