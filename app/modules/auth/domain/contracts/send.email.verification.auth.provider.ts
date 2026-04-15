export abstract class SendEmailVerificationAuthProvider {
  abstract sendEmailVerification(idToken: string): Promise<void>
}
