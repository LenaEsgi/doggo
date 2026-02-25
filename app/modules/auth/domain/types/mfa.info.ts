export type MfaInfo = {
  mfaEnrollmentId: string
  displayName?: string
  enrolledAt?: string
  totpInfo?: Record<string, unknown>
}
