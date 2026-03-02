import type { DeleteAccountResult } from '#auth/domain/types/delete.account.result'

export abstract class DeleteAccountAuthProvider {
  abstract deleteAccount(idToken: string): Promise<DeleteAccountResult>
}
