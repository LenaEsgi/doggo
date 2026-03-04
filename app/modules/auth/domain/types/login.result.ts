import { type AuthTokens } from '#auth/domain/types/auth.tokens'
import { type MfaInfo } from '#auth/domain/types/mfa.info'

export type LoginResult =
  | ({ mfaRequired: false } & AuthTokens)
  | {
      mfaRequired: true
      pendingCredential: string
      mfaInfo: MfaInfo[]
    }
