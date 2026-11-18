import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { Roles } from "../auth/roles.decorator.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { CreateInstitucionDto } from "./dto/create-institucion.dto.js";
import { InstitucionesService } from "./instituciones.service.js";

@ApiTags("Instituciones (Catálogo)")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Se requiere un JWT válido." })
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("instituciones")
export class InstitucionesController {
  constructor(private readonly institucionesService: InstitucionesService) {}

  @Get()
  @ApiOperation({ summary: "Listar instituciones (usuario autenticado)" })
  @ApiOkResponse({ description: "Instituciones ordenadas por nombre." })
  findAll() {
    return this.institucionesService.findAll();
  }

  @Post()
  @Roles("ADMIN")
  @ApiOperation({ summary: "Crear una institución (solo ADMIN)" })
  @ApiCreatedResponse({ description: "Institución creada." })
  @ApiForbiddenResponse({
    description: "Solo ADMIN puede crear instituciones.",
  })
  @ApiConflictResponse({
    description: "Ya existe una institución con ese nombre.",
  })
  create(@Body() dto: CreateInstitucionDto) {
    return this.institucionesService.create(dto);
  }

  @Delete(":id")
  @Roles("ADMIN")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Eliminar una institución (solo ADMIN)" })
  @ApiNoContentResponse({ description: "Institución eliminada." })
  @ApiForbiddenResponse({
    description: "Solo ADMIN puede eliminar instituciones.",
  })
  @ApiNotFoundResponse({ description: "La institución no existe." })
  @ApiConflictResponse({
    description:
      "La institución está asociada a trámites y no puede eliminarse.",
  })
  async remove(@Param("id", ParseIntPipe) id: number): Promise<void> {
    await this.institucionesService.remove(id);
  }
}
