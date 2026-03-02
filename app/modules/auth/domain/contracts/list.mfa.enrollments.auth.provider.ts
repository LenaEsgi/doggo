import type { MfaInfo } from '#auth/domain/types/mfa.info'

export abstract class ListMfaEnrollmentsAuthProvider {
  abstract listEnrollments(idToken: string): Promise<MfaInfo[]>
}
