import { inject } from '@adonisjs/core'
import { RegisterAuthService } from '#auth/application/contracts/register.auth.service'
import type { RegisterDto } from '#auth/application/dto/register.dto'
import { RegisterAuthProvider } from '#auth/domain/contracts/register.auth.provider'
import { LocalUserRepository } from '#auth/domain/contracts/local-user.repository'
import type { AuthTokens } from '#auth/domain/types/auth.tokens'

@inject()
export class RegisterAuth implements RegisterAuthService {
  constructor(
    private readonly authProvider: RegisterAuthProvider,
    private readonly localUserRepository: LocalUserRepository
  ) {}

  async register(payload: RegisterDto): Promise<AuthTokens> {
    const authUser = await this.authProvider.register(payload.email, payload.password)

    await this.localUserRepository.ensureUserProfile({
      firstname: payload.firstname,
      lastname: payload.lastname,
      email: payload.email,
    })

    return authUser
  }
}
