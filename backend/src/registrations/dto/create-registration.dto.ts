import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateRegistrationDto {
  @IsString()
  @IsNotEmpty()
  workshopId: string;

  @IsString()
  @IsNotEmpty()
  attendeeName: string;

  @IsEmail()
  attendeeEmail: string;
}
