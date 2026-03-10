import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { type StartTotpSetupDto } from '#auth/application/dto/start-totp-setup.dto'
import { StartTotpSetupAuthProvider } from '#auth/domain/contracts/start.totp.setup.auth.provider'
import { type TotpEnrollmentStart } from '#auth/domain/types/totp.enrollment.start'

@inject()
export class StartTotpSetupAuthUseCase {
  constructor(private readonly authProvider: StartTotpSetupAuthProvider) {}

  async execute(payload: StartTotpSetupDto): Promise<TotpEnrollmentStart> {
    logger.info({}, 'StartTotpSetupAuthUseCase started')
    const result = await this.authProvider.startTotpEnrollment(payload.idToken)
    logger.info({}, 'StartTotpSetupAuthUseCase completed successfully')
    return result
  }
}
