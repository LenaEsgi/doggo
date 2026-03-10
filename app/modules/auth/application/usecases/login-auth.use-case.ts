import { inject } from '@adonisjs/core'
import { type LoginDto } from '#auth/application/dto/login.dto'
import { LoginAuthProvider } from '#auth/domain/contracts/login.auth.provider'
import { type LoginResult } from '#auth/domain/types/login.result'

@inject()
export class LoginAuthUseCase {
  constructor(private readonly authProvider: LoginAuthProvider) {}

  execute(payload: LoginDto): Promise<LoginResult> {
    return this.authProvider.login(payload.email, payload.password)
  }
}
