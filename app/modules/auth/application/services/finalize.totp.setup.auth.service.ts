import { inject } from '@adonisjs/core'
import { FinalizeTotpSetupAuthService } from '#auth/application/contracts/finalize.totp.setup.auth.service'
import type { FinalizeTotpSetupDto } from '#auth/application/dto/finalize_totp_setup.dto'
import { FinalizeTotpSetupAuthProvider } from '#auth/domain/contracts/finalize.totp.setup.auth.provider'
import type { TotpFinalizeResult } from '#auth/domain/types/totp.finalize.result'

@inject()
export class FinalizeTotpSetupAuth implements FinalizeTotpSetupAuthService {
  constructor(private readonly authProvider: FinalizeTotpSetupAuthProvider) {}

  finalizeTotpSetup(payload: FinalizeTotpSetupDto): Promise<TotpFinalizeResult> {
    return this.authProvider.finalizeTotpEnrollment(
      payload.idToken,
      payload.sessionInfo,
      payload.verificationCode,
      payload.displayName
    )
  }
}
