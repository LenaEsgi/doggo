import type { DecodedIdToken } from 'firebase-admin/auth'

export abstract class FirebaseTokenVerifier {
  abstract handle(idToken: string): Promise<DecodedIdToken>
}
