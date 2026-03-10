import { inject } from '@adonisjs/core'
import { type StartTotpSetupDto } from '#auth/application/dto/start-totp-setup.dto'
import { StartTotpSetupAuthProvider } from '#auth/domain/contracts/start.totp.setup.auth.provider'
import { type TotpEnrollmentStart } from '#auth/domain/types/totp.enrollment.start'

@inject()
export class StartTotpSetupAuthUseCase {
  constructor(private readonly authProvider: StartTotpSetupAuthProvider) {}

  execute(payload: StartTotpSetupDto): Promise<TotpEnrollmentStart> {
    return this.authProvider.startTotpEnrollment(payload.idToken)
  }
}
