import {AuthTokens} from "#auth/domain/types/auth.tokens";
import {MfaInfo} from "#auth/domain/types/mfa.info";

export type LoginResult =
  | ({ mfaRequired: false } & AuthTokens)
  | {
  mfaRequired: true
  pendingCredential: string
  mfaInfo: MfaInfo[]
}
