export type TotpEnrollmentStart = {
  sessionInfo: string
  sharedSecret: string
  verificationCodeLength: number
  hashingAlgorithm: string
  periodSec: number
  otpauthUri: string
}
