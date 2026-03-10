export type UpdateUserDto = {
  firebaseUid?: string
  email?: string
  firstname?: string
  lastname?: string
  role?: 'user' | 'admin'
}
