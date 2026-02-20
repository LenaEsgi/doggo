import type { LoginDto } from '#auth/application/dto/login.dto'
import type { LoginResult } from '#auth/domain/types/auth.types'

export abstract class LoginAuthService {
  abstract login(payload: LoginDto): Promise<LoginResult>
}
