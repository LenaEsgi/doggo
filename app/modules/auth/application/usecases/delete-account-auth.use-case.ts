import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { type DeleteAccountDto } from '#auth/application/dto/delete-account.dto'
import { DeleteAccountAuthProvider } from '#auth/domain/contracts/delete.account.auth.provider'
import { LocalUserRepository } from '#auth/domain/contracts/local-user.repository'

@inject()
export class DeleteAccountAuthUseCase {
  constructor(
    private readonly authProvider: DeleteAccountAuthProvider,
    private readonly localUserRepository: LocalUserRepository
  ) {}

  async execute(payload: DeleteAccountDto): Promise<void> {
    logger.info({}, 'DeleteAccountAuthUseCase started')
    const deletedAccount = await this.authProvider.deleteAccount(payload.idToken)
    await this.localUserRepository.deleteByEmail(deletedAccount.email)
    logger.info({ email: deletedAccount.email }, 'DeleteAccountAuthUseCase completed successfully')
  }
}
