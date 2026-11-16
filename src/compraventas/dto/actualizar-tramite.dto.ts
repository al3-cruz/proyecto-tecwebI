import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class ActualizarTramiteDto {
  @ApiPropertyOptional({ minimum: 0, example: 1250.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  montoArancel?: number;

  @ApiPropertyOptional({
    description:
      'Registrar el pago mientras el trámite está en Inscripción Rápida.',
  })
  @IsOptional()
  @IsBoolean()
  arancelPagado?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  observaciones?: string | null;
}
