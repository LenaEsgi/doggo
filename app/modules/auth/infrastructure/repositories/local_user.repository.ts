import type { LocalUserRepository } from '../../domain/contracts/local_user.repository.js'
import UserModel from '../../../users/infrastructure/database/models/user.js'

export class LocalUserRepositoryImplementation implements LocalUserRepository {
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
}

export const localUserRepository = new LocalUserRepositoryImplementation()
