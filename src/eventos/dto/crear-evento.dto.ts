import { IsString, IsNotEmpty } from 'class-validator';

export class CrearEventoDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsString()
  @IsNotEmpty()
  fecha!: string;

  @IsString()
  @IsNotEmpty()
  ubicacion!: string;
}
