export abstract class DeleteUserService {
  abstract delete(id: string): Promise<boolean>
}
