import {AuthTokens} from "#auth/domain/types/auth.tokens";

export abstract class Register{
  abstract handle(email: string, password: string): Promise<AuthTokens>
}
