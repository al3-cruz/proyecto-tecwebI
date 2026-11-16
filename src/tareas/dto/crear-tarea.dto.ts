import { IsString, IsNotEmpty } from 'class-validator';

export class CrearTareaDto {
  @IsString()
  @IsNotEmpty()
  titulo!: string;

  @IsString()
  @IsNotEmpty()
  descripcion!: string;
}
