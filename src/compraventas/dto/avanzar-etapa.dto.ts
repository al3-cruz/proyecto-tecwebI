import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoTramite } from '../../generated/prisma/client.js';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class AvanzarEtapaDto {
  @ApiProperty({ enum: EstadoTramite })
  @IsEnum(EstadoTramite)
  estado!: EstadoTramite;

  @ApiPropertyOptional({
    description:
      'Motivo obligatorio cuando se marca el trámite como observado.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  observaciones?: string;

  @ApiPropertyOptional({
    description: 'Confirmación de entrega del Folio Real actualizado.',
  })
  @IsOptional()
  @IsBoolean()
  folioRealConfirmado?: boolean;

  @ApiPropertyOptional({
    description: 'Confirmación de entrega del Testimonio sellado.',
  })
  @IsOptional()
  @IsBoolean()
  testimonioSelladoConfirmado?: boolean;
}
