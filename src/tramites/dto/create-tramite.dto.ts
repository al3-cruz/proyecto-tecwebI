import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const MODALIDADES_TRAMITE = ['PRESENCIAL', 'VIRTUAL', 'MIXTA'] as const;
export type ModalidadTramite = (typeof MODALIDADES_TRAMITE)[number];

export class CreateRequisitoTramiteDto {
  @ApiProperty({ maxLength: 240, example: 'Cédula de identidad vigente' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(240)
  nombre!: string;

  @ApiProperty({ example: 'Presentar original para cotejo y copia legible.' })
  @IsString()
  @IsNotEmpty()
  detalle!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  obligatorio?: boolean = true;

  @ApiProperty({ minimum: 1, example: 1 })
  @IsInt()
  @Min(1)
  orden!: number;

  @ApiPropertyOptional({
    description: 'Condición que determina cuándo aplica este requisito.',
    example: 'Solo si el titular registral hubiera fallecido.',
  })
  @IsOptional()
  @IsString()
  notaCondicional?: string;
}

export class CreatePasoProcedimientoDto {
  @ApiProperty({ minimum: 1, example: 1 })
  @IsInt()
  @Min(1)
  orden!: number;

  @ApiProperty({ maxLength: 240, example: 'Presentar solicitud' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(240)
  titulo!: string;

  @ApiProperty({
    example: 'Ingresar la documentación ante la oficina competente.',
  })
  @IsString()
  @IsNotEmpty()
  descripcion!: string;

  @ApiPropertyOptional({ minimum: 1, example: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  plazoDias?: number;
}

export class CreateTramiteDto {
  @ApiProperty({ minimum: 1, maximum: 53, example: 1 })
  @IsInt()
  @Min(1)
  @Max(53)
  codigo!: number;

  @ApiPropertyOptional({ maxLength: 20, example: '1' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  codigoOficial?: string;

  @ApiProperty({
    maxLength: 240,
    example: 'Corrección de datos de identidad - Ley 247',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(240)
  titulo!: string;

  @ApiPropertyOptional({
    default: 'Registro Público de Derechos Reales',
    maxLength: 160,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  institucionResponsable?: string;

  @ApiPropertyOptional({
    maxLength: 160,
    example: 'Ventanilla de Inscripción Rápida',
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  oficina?: string;

  @ApiProperty({
    example: 'Corregir los datos de identidad del titular en el registro.',
  })
  @IsString()
  @IsNotEmpty()
  finalidad!: string;

  @ApiProperty({ minimum: 1, example: 5 })
  @IsInt()
  @Min(1)
  plazoEntregaDias!: number;

  @ApiProperty({ enum: MODALIDADES_TRAMITE, example: 'PRESENCIAL' })
  @IsString()
  @IsIn(MODALIDADES_TRAMITE)
  modalidad!: ModalidadTramite;

  @ApiPropertyOptional({
    example: 'Presentar todos los documentos en originales y dos fotocopias.',
  })
  @IsOptional()
  @IsString()
  notaRequisitos?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['Folio Real actualizado con el asiento inscrito.'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  documentosEntregables?: string[] = [];

  @ApiPropertyOptional({
    example: 'Ley N.º 247 y normativa registral vigente.',
  })
  @IsOptional()
  @IsString()
  baseLegal?: string;

  @ApiPropertyOptional({ example: '27 de octubre de 2025', maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  fechaActualizacionOficial?: string;

  @ApiPropertyOptional({ type: [CreateRequisitoTramiteDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CreateRequisitoTramiteDto)
  requisitos?: CreateRequisitoTramiteDto[] = [];

  @ApiPropertyOptional({ type: [CreatePasoProcedimientoDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CreatePasoProcedimientoDto)
  pasos?: CreatePasoProcedimientoDto[] = [];

  @ApiPropertyOptional({ type: [Number], example: [1, 2] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsInt({ each: true })
  @Min(1, { each: true })
  oficinaIds?: number[] = [];
}
