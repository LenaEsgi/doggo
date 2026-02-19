import type { StartTotpSetupDto } from '#auth/application/dto/start_totp_setup.dto'
import type { TotpEnrollmentStart } from '#auth/domain/types/auth.types'

export abstract class StartTotpSetupAuthService {
  abstract startTotpSetup(payload: StartTotpSetupDto): Promise<TotpEnrollmentStart>
}
