import { UserRole } from '#users/domain/enums/user.role'

export type UserLocale = 'fr' | 'en'

export class User {
  private constructor(
    public readonly id: string,
    public readonly firebaseUid: string,
    public readonly email: string,
    private _firstname: string,
    private _lastname: string,
    private _role: UserRole,
    private _locale: UserLocale
  ) {}

  public static create(
    id: string,
    firebaseUid: string,
    email: string,
    firstname: string,
    lastname: string
  ): User {
    return new User(id, firebaseUid, email, firstname, lastname, UserRole.USER, 'fr')
  }

  public static rehydrate(
    id: string,
    firebaseUid: string,
    email: string,
    firstname: string,
    lastname: string,
    role: UserRole,
    locale: UserLocale = 'fr'
  ): User {
    return new User(id, firebaseUid, email, firstname, lastname, role, locale)
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

  public get locale(): UserLocale {
    return this._locale
  }
}
