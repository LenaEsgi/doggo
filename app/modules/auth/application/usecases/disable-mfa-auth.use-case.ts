import { inject } from '@adonisjs/core'
import { type DisableMfaDto } from '#auth/application/dto/disable-mfa.dto'
import { DisableMfaAuthProvider } from '#auth/domain/contracts/disable.mfa.auth.provider'
import { type DisableMfaResult } from '#auth/domain/types/disable.mfa.result'

@inject()
export class DisableMfaAuthUseCase {
  constructor(private readonly authProvider: DisableMfaAuthProvider) {}

  execute(payload: DisableMfaDto): Promise<DisableMfaResult> {
    return this.authProvider.disableMfa(payload.idToken, payload.mfaEnrollmentId)
  }
}
