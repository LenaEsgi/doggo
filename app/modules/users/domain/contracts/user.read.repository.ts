import { type User } from '#users/domain/user.entity'
import { type PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'

export abstract class UserReadRepository {
  abstract findById(id: string): Promise<User | null>
  abstract findByIds(ids: string[]): Promise<User[]>
  abstract findByFirebaseUid(firebaseUid: string): Promise<User | null>
  abstract findAll(options?: {
    page: number
    limit: number
    search?: string
  }): Promise<PaginatedResult<User>>
}
