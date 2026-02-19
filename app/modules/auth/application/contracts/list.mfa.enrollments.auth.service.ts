import type { ListMfaEnrollmentsDto } from '#auth/application/dto/list_mfa_enrollments.dto'
import type { MfaInfo } from '#auth/domain/types/auth.types'

export abstract class ListMfaEnrollmentsAuthService {
  abstract listMfaEnrollments(payload: ListMfaEnrollmentsDto): Promise<MfaInfo[]>
}
