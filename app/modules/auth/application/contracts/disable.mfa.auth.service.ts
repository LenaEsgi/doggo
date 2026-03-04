import type { DisableMfaDto } from '#auth/application/dto/disable-mfa.dto'
import type { DisableMfaResult } from '#auth/domain/types/disable.mfa.result'

export abstract class DisableMfaAuthService {
  abstract disableMfa(payload: DisableMfaDto): Promise<DisableMfaResult>
}
