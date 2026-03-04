export type LoginWithTotpDto = {
  pendingCredential: string
  mfaEnrollmentId: string
  verificationCode: string
}
