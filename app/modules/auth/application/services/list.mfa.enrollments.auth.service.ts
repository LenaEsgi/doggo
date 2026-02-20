import { inject } from '@adonisjs/core'
import { ListMfaEnrollmentsAuthService } from '#auth/application/contracts/list.mfa.enrollments.auth.service'
import type { ListMfaEnrollmentsDto } from '#auth/application/dto/list_mfa_enrollments.dto'
import { AuthProvider } from '#auth/domain/contracts/auth.provider'
import type { MfaInfo } from '#auth/domain/types/auth.types'

@inject()
export class ListMfaEnrollmentsAuth implements ListMfaEnrollmentsAuthService {
  constructor(private readonly authProvider: AuthProvider) {}

  listMfaEnrollments(payload: ListMfaEnrollmentsDto): Promise<MfaInfo[]> {
    return this.authProvider.listEnrollments(payload.idToken)
  }
}
