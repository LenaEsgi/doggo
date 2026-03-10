import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { type LoginDto } from '#auth/application/dto/login.dto'
import { LoginAuthProvider } from '#auth/domain/contracts/login.auth.provider'
import { type LoginResult } from '#auth/domain/types/login.result'

@inject()
export class LoginAuthUseCase {
  constructor(private readonly authProvider: LoginAuthProvider) {}

  async execute(payload: LoginDto): Promise<LoginResult> {
    logger.info({ email: payload.email }, 'LoginAuthUseCase started')
    const result = await this.authProvider.login(payload.email, payload.password)
    logger.info({ email: payload.email }, 'LoginAuthUseCase completed successfully')
    return result
  }
}
