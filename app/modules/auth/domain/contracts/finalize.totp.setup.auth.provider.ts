import type { TotpFinalizeResult } from '#auth/domain/types/totp.finalize.result'

export abstract class FinalizeTotpSetupAuthProvider {
  abstract finalizeTotpEnrollment(
    idToken: string,
    sessionInfo: string,
    verificationCode: string,
    displayName?: string
  ): Promise<TotpFinalizeResult>
}
