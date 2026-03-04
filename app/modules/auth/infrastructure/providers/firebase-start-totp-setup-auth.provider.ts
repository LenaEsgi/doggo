import { type StartTotpSetupAuthProvider } from '#auth/domain/contracts/start.totp.setup.auth.provider'
import type { TotpEnrollmentStart } from '#auth/domain/types/totp.enrollment.start'
import {
  FirebaseAuthProviderBase,
  FirebaseHttpError,
} from '#auth/infrastructure/providers/firebase_auth.base'

export class FirebaseStartTotpSetupAuthProvider
  extends FirebaseAuthProviderBase
  implements StartTotpSetupAuthProvider
{
  async startTotpEnrollment(idToken: string): Promise<TotpEnrollmentStart> {
    const payload = await this.request<{
      totpSessionInfo?: {
        sessionInfo: string
        sharedSecretKey: string
        verificationCodeLength: number
        hashingAlgorithm: string
        periodSec: number
      }
    }>('v2/accounts/mfaEnrollment:start', {
      idToken,
      totpEnrollmentInfo: {},
    })

    const info = payload.totpSessionInfo

    if (!info?.sessionInfo || !info.sharedSecretKey) {
      throw new FirebaseHttpError(
        'Firebase did not return TOTP enrollment details',
        502,
        'TOTP_SETUP_INVALID'
      )
    }

    const email = this.tryExtractEmailFromIdToken(idToken)
    const label = email || 'user'
    const issuer = encodeURIComponent(this.issuerName)
    const secret = encodeURIComponent(info.sharedSecretKey)
    const account = encodeURIComponent(`${this.issuerName}:${label}`)
    const otpauthUri = `otpauth://totp/${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=${info.verificationCodeLength}&period=${info.periodSec}`

    return {
      sessionInfo: info.sessionInfo,
      sharedSecret: info.sharedSecretKey,
      verificationCodeLength: info.verificationCodeLength,
      hashingAlgorithm: info.hashingAlgorithm,
      periodSec: info.periodSec,
      otpauthUri,
    }
  }
}
