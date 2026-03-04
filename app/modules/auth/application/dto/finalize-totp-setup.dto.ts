export type FinalizeTotpSetupDto = {
  idToken: string
  sessionInfo: string
  verificationCode: string
  displayName?: string
}
