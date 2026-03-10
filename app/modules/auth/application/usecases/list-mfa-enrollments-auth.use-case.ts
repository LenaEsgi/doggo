import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { type ListMfaEnrollmentsDto } from '#auth/application/dto/list-mfa-enrollments.dto'
import { ListMfaEnrollmentsAuthProvider } from '#auth/domain/contracts/list.mfa.enrollments.auth.provider'
import { type MfaInfo } from '#auth/domain/types/mfa.info'

@inject()
export class ListMfaEnrollmentsAuthUseCase {
  constructor(private readonly authProvider: ListMfaEnrollmentsAuthProvider) {}

  async execute(payload: ListMfaEnrollmentsDto): Promise<MfaInfo[]> {
    logger.info({}, 'ListMfaEnrollmentsAuthUseCase started')
    const enrollments = await this.authProvider.listEnrollments(payload.idToken)
    logger.info(
      { count: enrollments.length },
      'ListMfaEnrollmentsAuthUseCase completed successfully'
    )
    return enrollments
  }
}
