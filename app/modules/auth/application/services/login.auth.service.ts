import { inject } from '@adonisjs/core'
import { LoginAuthService } from '#auth/application/contracts/login.auth.service'
import type { LoginDto } from '#auth/application/dto/login.dto'
import { LoginAuthProvider } from '#auth/domain/contracts/login.auth.provider'
import type { LoginResult } from '#auth/domain/types/login.result'

@inject()
export class LoginAuth implements LoginAuthService {
  constructor(private readonly authProvider: LoginAuthProvider) {}

  login(payload: LoginDto): Promise<LoginResult> {
    return this.authProvider.login(payload.email, payload.password)
  }
}
