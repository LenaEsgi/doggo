export abstract class LocalUserRepository {
  abstract ensureUserProfile(payload: {
    firebaseUid: string
    firstname: string
    lastname: string
    email: string
  }): Promise<void>
  abstract deleteByEmail(email: string): Promise<void>
}
