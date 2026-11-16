import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CrearTramiteDto {
  @ApiProperty({ maxLength: 100, example: '1.01.1.01.0001234' })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'El folio real no puede estar vacío.' })
  @MaxLength(100)
  folioReal!: string;

  @ApiProperty({ maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'El nombre del vendedor no puede estar vacío.' })
  @MaxLength(200)
  vendedorNombre!: string;

  @ApiProperty({ maxLength: 40, example: '1234567' })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'El documento del vendedor no puede estar vacío.' })
  @MaxLength(40)
  vendedorDocumento!: string;

  @ApiProperty({ maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'El nombre del comprador no puede estar vacío.' })
  @MaxLength(200)
  compradorNombre!: string;

  @ApiProperty({ maxLength: 40, example: '7654321' })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, {
    message: 'El documento del comprador no puede estar vacío.',
  })
  @MaxLength(40)
  compradorDocumento!: string;

  @ApiProperty({ default: false })
  @IsBoolean()
  esBienGanancial!: boolean;

  @ApiProperty({ default: false })
  @IsBoolean()
  conApoderado!: boolean;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  apoderadoNombre?: string;

  @ApiPropertyOptional({ maxLength: 40 })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  apoderadoDocumento?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  numeroPoderNotarial?: string;

  @ApiProperty({ minimum: 0, example: 1250.5 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  montoArancel!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones?: string;
}
