import type { PasswordResetDto } from '#auth/application/dto/password_reset.dto'

export abstract class PasswordResetAuthService {
  abstract sendPasswordReset(payload: PasswordResetDto): Promise<void>
}
