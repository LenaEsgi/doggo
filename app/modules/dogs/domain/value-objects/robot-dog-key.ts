export class RobotDogKey {
  private constructor(public readonly value: string) {}

  private static readonly CHAR_SET =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?'

  public static generate(): RobotDogKey {
    let key = ''
    for (let i = 0; i < 18; i++) {
      const randomIndex = Math.floor(Math.random() * RobotDogKey.CHAR_SET.length)
      key += RobotDogKey.CHAR_SET[randomIndex]
    }
    return new RobotDogKey(key)
  }

  public static fromString(value: string): RobotDogKey {
    if (!value || value.length !== 18) {
      throw new Error('RobotDogKey must be exactly 18 characters')
    }
    return new RobotDogKey(value)
  }

  public equals(other: RobotDogKey): boolean {
    return this.value === other.value
  }
}
