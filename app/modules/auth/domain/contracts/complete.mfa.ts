import {AuthTokens} from "#auth/domain/types/auth.tokens";

export abstract class CompleteMfa{
  abstract handle(pendingCredential: string,
                  mfaEnrollmentId: string,
                  verificationCode: string
  ): Promise<AuthTokens>
}
