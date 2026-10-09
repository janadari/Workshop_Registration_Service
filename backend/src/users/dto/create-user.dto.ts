import { IsEmail, IsNotEmpty, IsString, MinLength, IsIn } from 'class-validator';

/*
 * The three roles from the brief's permission matrix. Exported so that the
 * workshop/registration guards, the seed script and this DTO all describe the
 * same set of roles.
 */
export const ROLES = ['ADMIN', 'MANAGER', 'STAFF'] as const;

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;

  /*
   * Role was a free string, so "ADMIN", "admin" and "SuperVisor" were all
   * accepted. An unknown role is denied everywhere by RolesGuard (no privilege
   * escalation) but it silently creates an account that can do nothing.
   * Restricted to the three roles the brief defines.
   */
  @IsString()
  @IsNotEmpty()
  @IsIn(ROLES)
  role: string;
}
