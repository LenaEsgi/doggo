import { inject } from '@adonisjs/core'
import { LoginAuthService } from '#auth/application/contracts/login.auth.service'
import type { LoginDto } from '#auth/application/dto/login.dto'
import { AuthProvider } from '#auth/domain/contracts/auth.provider'
import type { LoginResult } from '#auth/domain/types/auth.types'

@inject()
export class LoginAuth implements LoginAuthService {
  constructor(private readonly authProvider: AuthProvider) {}

  login(payload: LoginDto): Promise<LoginResult> {
    return this.authProvider.login(payload.email, payload.password)
  }
}
