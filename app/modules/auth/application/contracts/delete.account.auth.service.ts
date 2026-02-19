import type { DeleteAccountDto } from '#auth/application/dto/delete_account.dto'

export abstract class DeleteAccountAuthService {
  abstract deleteAccount(payload: DeleteAccountDto): Promise<void>
}
