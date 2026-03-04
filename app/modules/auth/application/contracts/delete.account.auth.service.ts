import type { DeleteAccountDto } from '#auth/application/dto/delete-account.dto'

export abstract class DeleteAccountAuthService {
  abstract deleteAccount(payload: DeleteAccountDto): Promise<void>
}
