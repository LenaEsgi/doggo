import { inject } from '@adonisjs/core'
import { ListMfaEnrollmentsAuthService } from '#auth/application/contracts/list.mfa.enrollments.auth.service'
import type { ListMfaEnrollmentsDto } from '#auth/application/dto/list-mfa-enrollments.dto'
import { ListMfaEnrollmentsAuthProvider } from '#auth/domain/contracts/list.mfa.enrollments.auth.provider'
import type { MfaInfo } from '#auth/domain/types/mfa.info'

@inject()
export class ListMfaEnrollmentsAuth implements ListMfaEnrollmentsAuthService {
  constructor(private readonly authProvider: ListMfaEnrollmentsAuthProvider) {}

  listMfaEnrollments(payload: ListMfaEnrollmentsDto): Promise<MfaInfo[]> {
    return this.authProvider.listEnrollments(payload.idToken)
  }
}
