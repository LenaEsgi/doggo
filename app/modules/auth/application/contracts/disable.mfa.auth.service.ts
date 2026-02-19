import type { DisableMfaDto } from '#auth/application/dto/disable_mfa.dto'
import type { DisableMfaResult } from '#auth/domain/types/auth.types'

export abstract class DisableMfaAuthService {
  abstract disableMfa(payload: DisableMfaDto): Promise<DisableMfaResult>
}
