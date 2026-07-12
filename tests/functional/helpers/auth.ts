import app from '@adonisjs/core/services/app'
import type { DecodedIdToken } from 'firebase-admin/auth'
import { FirebaseTokenVerifier } from '#middleware/auth/contracts/firebase-token-verifier'
import UserModel from '#users/infrastructure/database/models/user'
import { UserRole } from '#users/domain/enums/user.role'

class FakeFirebaseTokenVerifier extends FirebaseTokenVerifier {
  constructor(private readonly uid: string) {
    super()
  }

  async handle(): Promise<DecodedIdToken> {
    const now = Math.floor(Date.now() / 1000)
    return {
      uid: this.uid,
      sub: this.uid,
      aud: 'doggo-test',
      auth_time: now,
      iat: now,
      exp: now + 3600,
      iss: 'https://securetoken.google.com/doggo-test',
      email: `${this.uid}@example.com`,
      email_verified: true,
      firebase: { identities: {}, sign_in_provider: 'password' },
    } as DecodedIdToken
  }
}

interface AuthOptions {
  firebaseUid?: string
  role?: UserRole
  token?: string
}

/**
 * Seed un utilisateur, remplace le vérificateur Firebase par un faux qui valide
 * n'importe quel token pour cet uid, et restaure au cleanup. Renvoie l'en-tête à poser.
 */
export async function authenticateAs(
  cleanup: (fn: () => void) => void,
  opts: AuthOptions = {}
): Promise<{ header: string; user: UserModel }> {
  const firebaseUid = opts.firebaseUid ?? 'firebase-uid-test'
  const token = opts.token ?? 'valid-id-token'

  const user = await UserModel.create({
    firebaseUid,
    firstname: 'Test',
    lastname: 'User',
    email: `${firebaseUid}@example.com`,
    role: opts.role ?? UserRole.USER,
  })

  app.container.swap(FirebaseTokenVerifier, () => new FakeFirebaseTokenVerifier(firebaseUid))
  cleanup(() => app.container.restore(FirebaseTokenVerifier))

  return { header: `Bearer ${token}`, user }
}
