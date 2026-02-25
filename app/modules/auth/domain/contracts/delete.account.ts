import {DeleteAccountResult} from "#auth/domain/types/delete.account.result";

export abstract class DeleteAccount {
  abstract handle(idToken: string): Promise<DeleteAccountResult>
}
