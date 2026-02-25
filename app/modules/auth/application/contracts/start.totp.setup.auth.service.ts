import type { StartTotpSetupDto } from '#auth/application/dto/start_totp_setup.dto'
import type { TotpEnrollmentStart } from '#auth/domain/types/totp.enrollment.start'

export abstract class StartTotpSetupAuthService {
  abstract startTotpSetup(payload: StartTotpSetupDto): Promise<TotpEnrollmentStart>
}
