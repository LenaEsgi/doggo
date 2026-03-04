export abstract class LocalUserRepository {
  abstract ensureUserProfile(payload: {
    firstname: string
    lastname: string
    email: string
  }): Promise<void>
  abstract deleteByEmail(email: string): Promise<void>
}
