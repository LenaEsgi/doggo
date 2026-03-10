import { inject } from '@adonisjs/core'
import { type ListMfaEnrollmentsDto } from '#auth/application/dto/list-mfa-enrollments.dto'
import { ListMfaEnrollmentsAuthProvider } from '#auth/domain/contracts/list.mfa.enrollments.auth.provider'
import { type MfaInfo } from '#auth/domain/types/mfa.info'

@inject()
export class ListMfaEnrollmentsAuthUseCase {
  constructor(private readonly authProvider: ListMfaEnrollmentsAuthProvider) {}

  execute(payload: ListMfaEnrollmentsDto): Promise<MfaInfo[]> {
    return this.authProvider.listEnrollments(payload.idToken)
  }
}
