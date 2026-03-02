import type { LoginResult } from '#auth/domain/types/login.result'

export abstract class LoginAuthProvider {
  abstract login(email: string, password: string): Promise<LoginResult>
}
