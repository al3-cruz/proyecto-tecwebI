import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsNumber } from 'class-validator';

export class CreateObservacionDto {
  @IsNumber() // Cambiado a validador de número
  @IsNotEmpty()
  tramiteId: number; // Ahora coincide con el ID robusto de los trámites

  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsBoolean()
  @IsOptional()
  resuelta?: boolean = false;
}
