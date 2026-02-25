import {LoginResult} from "#auth/domain/types/login.result";

export abstract class Login{
  abstract handle(email: string, password: string): Promise<LoginResult>
}
