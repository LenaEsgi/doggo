export type AuthTokens = {
  localId: string
  email: string
  idToken: string
  refreshToken: string
  expiresIn: string
}

export type MfaInfo = {
  mfaEnrollmentId: string
  displayName?: string
  enrolledAt?: string
  totpInfo?: Record<string, unknown>
}

export type LoginResult =
  | ({ mfaRequired: false } & AuthTokens)
  | {
  mfaRequired: true
  pendingCredential: string
  mfaInfo: MfaInfo[]
}

export type TotpEnrollmentStart = {
  sessionInfo: string
  sharedSecret: string
  verificationCodeLength: number
  hashingAlgorithm: string
  periodSec: number
  otpauthUri: string
}

export type TotpFinalizeResult = {
  idToken: string
  refreshToken: string
  mfaEnrollmentId?: string
}

export type DisableMfaResult = {
  idToken: string
  refreshToken: string
}
