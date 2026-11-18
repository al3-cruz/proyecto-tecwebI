import {
  Controller,
  Get,
  ParseIntPipe,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { UbicacionesService } from "./ubicaciones.service.js";

@ApiTags("Ubicaciones")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("ubicaciones")
export class UbicacionesController {
  constructor(private readonly ubicacionesService: UbicacionesService) {}

  @Get()
  @ApiOperation({
    summary: "Listar departamentos, provincias o municipios",
  })
  @ApiQuery({
    name: "padreId",
    required: false,
    type: Number,
    description: "Si se omite, devuelve departamentos.",
  })
  findAll(
    @Query("padreId", new ParseIntPipe({ optional: true })) padreId?: number,
  ) {
    return this.ubicacionesService.findAll(padreId);
  }
}
