import { User } from '#users/domain/user.entity'
import { CreateUserDto } from '#users/application/dto/create.user.dto'

export abstract class CreateUserService {
  abstract create(user: CreateUserDto): Promise<User>
}
