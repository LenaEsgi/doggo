import { inject } from '@adonisjs/core'
import { DisableMfaAuthService } from '#auth/application/contracts/disable.mfa.auth.service'
import type { DisableMfaDto } from '#auth/application/dto/disable_mfa.dto'
import { AuthProvider } from '#auth/domain/contracts/auth.provider'
import type { DisableMfaResult } from '#auth/domain/types/auth.types'

@inject()
export class DisableMfaAuth implements DisableMfaAuthService {
  constructor(private readonly authProvider: AuthProvider) {}

  disableMfa(payload: DisableMfaDto): Promise<DisableMfaResult> {
    return this.authProvider.disableMfa(payload.idToken, payload.mfaEnrollmentId)
  }
}
