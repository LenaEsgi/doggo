import { FirebaseTokenVerifier } from '#middleware/auth/contracts/firebase-token-verifier'
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth'

export class FirebaseAdminTokenVerifier extends FirebaseTokenVerifier {
  async handle(idToken: string): Promise<DecodedIdToken> {
    return getAuth().verifyIdToken(idToken)
  }
}
