export abstract class TotpEnrollmentStart {
  abstract handle(idToken: string): Promise<TotpEnrollmentStart>
}
