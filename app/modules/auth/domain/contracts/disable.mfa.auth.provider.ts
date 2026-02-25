import type { DisableMfaResult } from '#auth/domain/types/disable.mfa.result'

export abstract class DisableMfaAuthProvider {
  abstract disableMfa(idToken: string, mfaEnrollmentId: string): Promise<DisableMfaResult>
}
