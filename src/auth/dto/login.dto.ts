import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ maxLength: 254, example: 'persona@example.com' })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({
    minLength: 8,
    maxLength: 72,
    format: 'password',
    example: 'UnaClaveSegura123!',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}
