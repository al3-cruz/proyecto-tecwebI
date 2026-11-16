import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, Min } from 'class-validator';

export class VerificarRequisitoDto {
  @ApiProperty()
  @IsBoolean()
  presentoOriginal!: boolean;

  @ApiProperty({ minimum: 0, example: 2 })
  @IsInt()
  @Min(0)
  cantidadFotocopias!: number;

  @ApiProperty()
  @IsBoolean()
  verificado!: boolean;
}
