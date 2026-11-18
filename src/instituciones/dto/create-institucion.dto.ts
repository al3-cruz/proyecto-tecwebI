import { Transform } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class CreateInstitucionDto {
  @ApiProperty({ maxLength: 160, example: "Derechos Reales" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  nombre!: string;
}
