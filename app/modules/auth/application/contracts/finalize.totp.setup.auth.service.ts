import type { FinalizeTotpSetupDto } from '#auth/application/dto/finalize_totp_setup.dto'
import type { TotpFinalizeResult } from '#auth/domain/types/auth.types'

export abstract class FinalizeTotpSetupAuthService {
  abstract finalizeTotpSetup(payload: FinalizeTotpSetupDto): Promise<TotpFinalizeResult>
}
