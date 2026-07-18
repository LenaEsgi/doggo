import { LocalUserRepository } from '#auth/domain/contracts/local-user.repository'
import UserModel from '#users/infrastructure/database/models/user'
import { UserRole } from '#users/domain/enums/user.role'

export class LocalUserRepositoryImplementation extends LocalUserRepository {
  async ensureUserProfile(payload: {
    firebaseUid: string
    firstname: string
    lastname: string
    email: string
  }): Promise<void> {
    await UserModel.updateOrCreate(
      { firebaseUid: payload.firebaseUid },
      {
        firebaseUid: payload.firebaseUid,
        firstname: payload.firstname,
        lastname: payload.lastname,
        email: payload.email,
        role: UserRole.USER,
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
