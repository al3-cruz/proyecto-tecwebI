import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class AsignarPermisosDto {
  @ApiPropertyOptional({
    type: [Number],
    example: [1, 2],
    description: 'Reemplaza los permisos usando sus IDs.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  permisosIds?: number[];

  @ApiPropertyOptional({
    type: [String],
    example: ['tramites:leer'],
    description: 'Reemplaza los permisos usando sus códigos.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  codigos?: string[];
}
