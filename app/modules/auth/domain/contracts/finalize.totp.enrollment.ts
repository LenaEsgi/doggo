import {TotpFinalizeResult} from "#auth/domain/types/totp.finalize.result";

export abstract class FinalizeTotpEnrollmentEnd {
  abstract handle(
    idToken: string,
    sessionInfo: string,
    verificationCode: string,
    displayName?: string
  ): Promise<TotpFinalizeResult>
}
