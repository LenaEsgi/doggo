export interface LocalUserRepository {
  ensureUserProfile(payload: {
    firstname: string
    lastname: string
    email: string
  }): Promise<void>
}
