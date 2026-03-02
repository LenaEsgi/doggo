import type { FinalizeTotpSetupDto } from '#auth/application/dto/finalize_totp_setup.dto'
import type { TotpFinalizeResult } from '#auth/domain/types/totp.finalize.result'

export abstract class FinalizeTotpSetupAuthService {
  abstract finalizeTotpSetup(payload: FinalizeTotpSetupDto): Promise<TotpFinalizeResult>
}
