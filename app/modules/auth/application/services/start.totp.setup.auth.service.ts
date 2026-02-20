import { inject } from '@adonisjs/core'
import { StartTotpSetupAuthService } from '#auth/application/contracts/start.totp.setup.auth.service'
import type { StartTotpSetupDto } from '#auth/application/dto/start_totp_setup.dto'
import { AuthProvider } from '#auth/domain/contracts/auth.provider'
import type { TotpEnrollmentStart } from '#auth/domain/types/auth.types'

@inject()
export class StartTotpSetupAuth implements StartTotpSetupAuthService {
  constructor(private readonly authProvider: AuthProvider) {}

  startTotpSetup(payload: StartTotpSetupDto): Promise<TotpEnrollmentStart> {
    return this.authProvider.startTotpEnrollment(payload.idToken)
  }
}
