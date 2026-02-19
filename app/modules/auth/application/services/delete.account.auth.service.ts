import { inject } from '@adonisjs/core'
import { DeleteAccountAuthService } from '#auth/application/contracts/delete.account.auth.service'
import type { DeleteAccountDto } from '#auth/application/dto/delete_account.dto'
import { AuthProvider } from '#auth/domain/contracts/auth.provider'
import { LocalUserRepository } from '#auth/domain/contracts/local_user.repository'

@inject()
export class DeleteAccountAuth implements DeleteAccountAuthService {
  constructor(
    private readonly authProvider: AuthProvider,
    private readonly localUserRepository: LocalUserRepository
  ) {}

  async deleteAccount(payload: DeleteAccountDto): Promise<void> {
    const deletedAccount = await this.authProvider.deleteAccount(payload.idToken)
    await this.localUserRepository.deleteByEmail(deletedAccount.email)
  }
}
