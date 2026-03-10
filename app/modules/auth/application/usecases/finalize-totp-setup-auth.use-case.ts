import { inject } from '@adonisjs/core'
import { type FinalizeTotpSetupDto } from '#auth/application/dto/finalize-totp-setup.dto'
import { FinalizeTotpSetupAuthProvider } from '#auth/domain/contracts/finalize.totp.setup.auth.provider'
import { type TotpFinalizeResult } from '#auth/domain/types/totp.finalize.result'

@inject()
export class FinalizeTotpSetupAuthUseCase {
  constructor(private readonly authProvider: FinalizeTotpSetupAuthProvider) {}

  execute(payload: FinalizeTotpSetupDto): Promise<TotpFinalizeResult> {
    return this.authProvider.finalizeTotpEnrollment(
      payload.idToken,
      payload.sessionInfo,
      payload.verificationCode,
      payload.displayName
    )
  }
}
