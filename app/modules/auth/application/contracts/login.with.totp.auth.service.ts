import type { LoginWithTotpDto } from '#auth/application/dto/login_with_totp.dto'
import type { AuthTokens } from '#auth/domain/types/auth.tokens'

export abstract class LoginWithTotpAuthService {
  abstract loginWithTotp(payload: LoginWithTotpDto): Promise<AuthTokens>
}
