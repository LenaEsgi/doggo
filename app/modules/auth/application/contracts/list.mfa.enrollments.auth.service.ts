import type { ListMfaEnrollmentsDto } from '#auth/application/dto/list-mfa-enrollments.dto'
import type { MfaInfo } from '#auth/domain/types/mfa.info'

export abstract class ListMfaEnrollmentsAuthService {
  abstract listMfaEnrollments(payload: ListMfaEnrollmentsDto): Promise<MfaInfo[]>
}
