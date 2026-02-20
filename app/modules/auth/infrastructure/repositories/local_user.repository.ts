import { LocalUserRepository } from '#auth/domain/contracts/local_user.repository'
import UserModel from '#users/infrastructure/database/models/user'

export class LocalUserRepositoryImplementation extends LocalUserRepository {
  async ensureUserProfile(payload: {
    firstname: string
    lastname: string
    email: string
  }): Promise<void> {
    await UserModel.firstOrCreate(
      { email: payload.email },
      {
        firstname: payload.firstname,
        lastname: payload.lastname,
        email: payload.email,
        role: 'user' as unknown as UserModel['role'],
      }
    )
  }

  async deleteByEmail(email: string): Promise<void> {
    const user = await UserModel.query().where('email', email).first()
    if (!user) {
      return
    }

    await user.delete()
  }
}
