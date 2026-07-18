export type UpdateUserDto = {
  email?: string
  firstname?: string
  lastname?: string
  role?: 'user' | 'admin'
}
