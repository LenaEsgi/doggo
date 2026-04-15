import { UserRole } from '#users/domain/enums/user.role'

export class User {
  private constructor(
    public readonly id: string,
    public readonly firebaseUid: string,
    public readonly email: string,
    private _firstname: string,
    private _lastname: string,
    private _role: UserRole,
    private _emailVerified: boolean
  ) {}

  public static create(
    id: string,
    firebaseUid: string,
    email: string,
    firstname: string,
    lastname: string,
    emailVerified: boolean = false
    // role: UserRole --- A voir si on peut créer direct un admin
  ): User {
    return new User(id, firebaseUid, email, firstname, lastname, UserRole.USER, emailVerified)
  }

  public static rehydrate(
    id: string,
    firebaseUid: string,
    email: string,
    firstname: string,
    lastname: string,
    role: UserRole,
    emailVerified: boolean
  ): User {
    return new User(id, firebaseUid, email, firstname, lastname, role, emailVerified)
  }

  // -------------------
  // Getter
  // -------------------

  public get role(): UserRole {
    return this._role
  }

  public get firstname(): string {
    return this._firstname
  }

  public get lastname(): string {
    return this._lastname
  }

  public get emailVerified(): boolean {
    return this._emailVerified
  }
}
