import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MODALIDADES_TRAMITE } from './create-tramite.dto';
import type { ModalidadTramite } from './create-tramite.dto';

export class FilterTramiteDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 10;

  @ApiPropertyOptional({ maxLength: 240, example: 'herencia' })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  search?: string;

  @ApiPropertyOptional({ enum: MODALIDADES_TRAMITE })
  @IsOptional()
  @IsString()
  @IsIn(MODALIDADES_TRAMITE)
  modalidad?: ModalidadTramite;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  oficinaId?: number;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  plazoMaximoDias?: number;
}
