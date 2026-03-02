import type { RegisterDto } from '#auth/application/dto/register.dto'
import type { AuthTokens } from '#auth/domain/types/auth.tokens'

export abstract class RegisterAuthService {
  abstract register(payload: RegisterDto): Promise<AuthTokens>
}
