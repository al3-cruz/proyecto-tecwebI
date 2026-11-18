import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

export class CreateDireccionDto {
  @ApiProperty({
    description: "ID de la ubicación de tipo municipio",
    example: 3,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  municipioId!: number;

  @ApiProperty({ example: "Centro", maxLength: 160 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  zonaOComunidad!: string;

  @ApiProperty({ example: "Avenida central", maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  calleOAvenida!: string;

  @ApiPropertyOptional({ example: "123", maxLength: 40 })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  numeroPuerta?: string;
}
