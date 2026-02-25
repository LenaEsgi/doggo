import { inject } from '@adonisjs/core'
import { StartTotpSetupAuthService } from '#auth/application/contracts/start.totp.setup.auth.service'
import type { StartTotpSetupDto } from '#auth/application/dto/start_totp_setup.dto'
import { StartTotpSetupAuthProvider } from '#auth/domain/contracts/start.totp.setup.auth.provider'
import type { TotpEnrollmentStart } from '#auth/domain/types/totp.enrollment.start'

@inject()
export class StartTotpSetupAuth implements StartTotpSetupAuthService {
  constructor(private readonly authProvider: StartTotpSetupAuthProvider) {}

  startTotpSetup(payload: StartTotpSetupDto): Promise<TotpEnrollmentStart> {
    return this.authProvider.startTotpEnrollment(payload.idToken)
  }
}
