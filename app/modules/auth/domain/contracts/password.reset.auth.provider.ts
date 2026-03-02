export abstract class PasswordResetAuthProvider {
  abstract sendPasswordResetEmail(email: string): Promise<void>
}
