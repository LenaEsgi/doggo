import type { AuthTokens } from '#auth/domain/types/auth.tokens'

export abstract class RegisterAuthProvider {
  abstract register(email: string, password: string): Promise<AuthTokens>
}
