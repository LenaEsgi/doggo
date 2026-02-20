import { User } from '#users/domain/user.entity'
import { UpdateUserDto } from '#users/application/dto/update.user.dto'

export abstract class UpdateUserService {
  abstract update(id: string, payload: UpdateUserDto): Promise<User | null>
}
