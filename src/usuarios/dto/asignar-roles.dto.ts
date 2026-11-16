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

export class AsignarRolesDto {
  @ApiPropertyOptional({
    type: [Number],
    example: [2],
    description: 'Reemplaza los roles usando sus IDs.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  rolesIds?: number[];

  @ApiPropertyOptional({
    type: [String],
    example: ['GESTOR'],
    description: 'Reemplaza los roles usando sus códigos.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  codigos?: string[];
}
