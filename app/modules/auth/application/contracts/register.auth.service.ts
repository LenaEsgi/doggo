import type { RegisterDto } from '#auth/application/dto/register.dto'
import type { AuthTokens } from '#auth/domain/types/auth.types'

export abstract class RegisterAuthService {
  abstract register(payload: RegisterDto): Promise<AuthTokens>
}
