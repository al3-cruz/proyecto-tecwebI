import { IsString, IsNotEmpty, IsEmail, IsOptional, Length } from 'class-validator';

export class CreateUsuarioDto {
  @IsString()
  @IsNotEmpty()
  @Length(7, 15, { message: 'El CI debe tener entre 7 y 15 caracteres.' })
  ci: string; // Cédula de Identidad (Es string porque puede incluir extensiones como LP, SC, etc.)

  @IsString()
  @IsNotEmpty()
  nombreCompleto: string;

  @IsEmail({}, { message: 'El formato del correo electrónico no es válido.' })
  @IsNotEmpty()
  correo: string;

  @IsString()
  @IsOptional()
  telefono?: string;
}
