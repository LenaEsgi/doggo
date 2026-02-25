import type { TotpEnrollmentStart } from '#auth/domain/types/totp.enrollment.start'

export abstract class StartTotpSetupAuthProvider {
  abstract startTotpEnrollment(idToken: string): Promise<TotpEnrollmentStart>
}
