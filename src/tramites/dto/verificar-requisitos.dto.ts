import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VerificarRequisitosDto {
  @ApiProperty({
    type: [Number],
    description: 'IDs de requisitos que el ciudadano ya tiene.',
    example: [1, 3],
  })
  @IsArray()
  @ArrayMaxSize(500)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  requisitosCumplidosIds!: number[];

  @ApiPropertyOptional({
    type: String,
    format: 'date',
    example: '2026-11-12',
    description: 'Fecha desde la que se calcula el plazo hábil.',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  fechaInicio?: string;
}
