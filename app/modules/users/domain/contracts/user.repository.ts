import { User } from '../user.entity.js'

export interface UserRepository {
  findById(id: string): Promise<User | null>
  findAll(): Promise<User[]>
  save(dog: User): Promise<void>
  delete(id: string): Promise<void>
}
