import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsLatitude, IsLongitude, IsOptional } from 'class-validator';

export const MODOS_RUTA_GPS = ['driving', 'foot'] as const;
export type ModoRutaGps = (typeof MODOS_RUTA_GPS)[number];

export class CalcularRutaGpsDto {
  @ApiProperty({ example: '-19.0333', description: 'Latitud del punto de origen.' })
  @IsLatitude()
  origenLatitud!: string;

  @ApiProperty({
    example: '-65.2627',
    description: 'Longitud del punto de origen.',
  })
  @IsLongitude()
  origenLongitud!: string;

  @ApiPropertyOptional({
    enum: MODOS_RUTA_GPS,
    default: 'driving',
    description: 'Perfil de desplazamiento solicitado a OSRM.',
  })
  @IsOptional()
  @IsIn(MODOS_RUTA_GPS)
  modo: ModoRutaGps = 'driving';
}
