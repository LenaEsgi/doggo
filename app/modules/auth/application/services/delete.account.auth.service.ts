import { inject } from '@adonisjs/core'
import { DeleteAccountAuthService } from '#auth/application/contracts/delete.account.auth.service'
import type { DeleteAccountDto } from '#auth/application/dto/delete-account.dto'
import { DeleteAccountAuthProvider } from '#auth/domain/contracts/delete.account.auth.provider'
import { LocalUserRepository } from '#auth/domain/contracts/local-user.repository'

@inject()
export class DeleteAccountAuth implements DeleteAccountAuthService {
  constructor(
    private readonly authProvider: DeleteAccountAuthProvider,
    private readonly localUserRepository: LocalUserRepository
  ) {}

  async deleteAccount(payload: DeleteAccountDto): Promise<void> {
    const deletedAccount = await this.authProvider.deleteAccount(payload.idToken)
    await this.localUserRepository.deleteByEmail(deletedAccount.email)
  }
}
