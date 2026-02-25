export abstract class SendPasswordResetEmail{
  abstract handle(email: string): Promise<void>
}
