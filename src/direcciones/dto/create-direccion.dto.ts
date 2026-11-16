import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDireccionDto {
  @ApiPropertyOptional({ example: 'LPZ-CENTRAL', maxLength: 40 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  codigoOficina?: string;

  @ApiPropertyOptional({
    example: 'Oficina de Derechos Reales - La Paz',
    maxLength: 160,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  nombreOficina?: string;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  usuarioId?: number;

  @ApiProperty({ example: 'La Paz', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  departamento!: string;

  @ApiProperty({ example: 'Murillo', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  provincia!: string;

  @ApiProperty({ example: 'La Paz', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  municipio!: string;

  @ApiProperty({ example: 'Centro', maxLength: 160 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  zonaOComunidad!: string;

  @ApiProperty({ example: 'Avenida central', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  calleOAvenida!: string;

  @ApiPropertyOptional({ example: '123', maxLength: 40 })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  numeroPuerta?: string;

  @ApiPropertyOptional({ minimum: -90, maximum: 90, example: -19.04295 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitud?: number;

  @ApiPropertyOptional({ minimum: -180, maximum: 180, example: -65.25548 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitud?: number;

  @ApiPropertyOptional({
    type: [Number],
    description: 'IDs de trámites asociados a esta oficina.',
    example: [1, 2],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsInt({ each: true })
  @Min(1, { each: true })
  tramiteIds?: number[];
}
