import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { Roles } from "../auth/roles.decorator.js";
import { RolesGuard } from "../auth/roles.guard.js";
import type { UsuarioAutenticado } from "../auth/interfaces/usuario-autenticado.interface.js";
import { FilterTramiteDto } from "./dto/filter-tramite.dto";
import { VerificarRequisitosDto } from "./dto/verificar-requisitos.dto";
import { TramitesService } from "./tramites.service";
import {
  CreateRequisitoTramiteDto,
  CreateTramiteDto,
  MODALIDADES_TRAMITE,
} from "./dto/create-tramite.dto";
import { UpdateTramiteDto } from "./dto/update-tramite.dto";

@ApiTags("Trámites")
@ApiBearerAuth()
@ApiBadRequestResponse({
  description: "Los datos enviados o una relación no son válidos.",
})
@Controller("tramites")
@UseGuards(JwtAuthGuard)
export class TramitesController {
  constructor(private readonly tramitesService: TramitesService) {}

  @Get()
  @ApiOperation({ summary: "Listar y filtrar trámites" })
  @ApiOkResponse({
    description: "Página de trámites con metadatos de paginación.",
  })
  @ApiQuery({ name: "page", required: false, type: Number, example: 1 })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    maximum: 50,
    example: 10,
  })
  @ApiQuery({
    name: "search",
    required: false,
    description: "Busca en título, finalidad y requisitos.",
  })
  @ApiQuery({ name: "modalidad", required: false, enum: MODALIDADES_TRAMITE })
  @ApiQuery({ name: "oficinaId", required: false, type: Number })
  @ApiQuery({ name: "plazoMaximoDias", required: false, type: Number })
  findAll(@Query() filtros: FilterTramiteDto) {
    return this.tramitesService.findAll(filtros);
  }

  @Get("estadisticas")
  @UseGuards(RolesGuard)
  @Roles("ADMIN")
  @ApiOperation({ summary: "Obtener estadísticas y métricas del catálogo" })
  @ApiForbiddenResponse({
    description: "Solo ADMIN puede consultar estas estadísticas globales.",
  })
  @ApiOkResponse({
    description:
      "Conteos, promedio de plazos y distribución por modalidad y oficina.",
  })
  obtenerEstadisticas() {
    return this.tramitesService.obtenerEstadisticas();
  }

  @Get(":id")
  @ApiOperation({
    summary: "Obtener trámite por ID con requisitos, pasos y oficinas",
  })
  @ApiParam({ name: "id", type: Number })
  @ApiOkResponse({ description: "Trámite encontrado." })
  @ApiNotFoundResponse({ description: "El trámite no existe." })
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.tramitesService.findOne(id);
  }

  @Post(":id/verificar-requisitos")
  @ApiOperation({
    summary: "Verificar documentos y estimar fecha de entrega hábil",
  })
  @ApiParam({ name: "id", type: Number })
  @ApiOkResponse({
    description: "Resultado de requisitos y fecha estimada de entrega.",
  })
  @ApiNotFoundResponse({ description: "El trámite no existe." })
  verificarRequisitos(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: VerificarRequisitosDto,
  ) {
    return this.tramitesService.verificarRequisitos(id, dto);
  }

  @Get(":id/relacionados")
  @ApiOperation({ summary: "Sugerir hasta cuatro trámites relacionados" })
  @ApiParam({ name: "id", type: Number })
  @ApiOkResponse({
    description:
      "Trámites con modalidad u oficina en común, ordenados por código.",
  })
  @ApiNotFoundResponse({ description: "El trámite no existe." })
  relacionados(@Param("id", ParseIntPipe) id: number) {
    return this.tramitesService.relacionados(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles("ADMIN")
  @HttpCode(HttpStatus.CREATED)
  @ApiForbiddenResponse({ description: "Solo ADMIN puede crear trámites." })
  @ApiOperation({
    summary: "Crear un trámite con requisitos, pasos y oficinas",
  })
  @ApiCreatedResponse({ description: "Trámite creado." })
  create(
    @Body() createTramiteDto: CreateTramiteDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.tramitesService.create(createTramiteDto, user.sub);
  }

  @Put(":id")
  @UseGuards(RolesGuard)
  @Roles("ADMIN")
  @ApiForbiddenResponse({ description: "Solo ADMIN puede editar trámites." })
  @ApiOperation({ summary: "Reemplazar completamente un trámite" })
  @ApiParam({ name: "id", type: Number })
  @ApiOkResponse({ description: "Trámite reemplazado." })
  @ApiNotFoundResponse({ description: "El trámite no existe." })
  updateFull(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateTramiteDto: CreateTramiteDto,
  ) {
    return this.tramitesService.replace(id, updateTramiteDto);
  }

  @Patch(":id")
  @UseGuards(RolesGuard)
  @Roles("ADMIN")
  @ApiForbiddenResponse({ description: "Solo ADMIN puede editar trámites." })
  @ApiOperation({ summary: "Actualizar parcialmente un trámite" })
  @ApiParam({ name: "id", type: Number })
  @ApiOkResponse({ description: "Trámite actualizado." })
  @ApiNotFoundResponse({ description: "El trámite no existe." })
  updatePartial(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateTramiteDto: UpdateTramiteDto,
  ) {
    return this.tramitesService.update(id, updateTramiteDto);
  }

  @Post(":id/requisitos")
  @UseGuards(RolesGuard)
  @Roles("ADMIN")
  @HttpCode(HttpStatus.CREATED)
  @ApiForbiddenResponse({
    description: "Solo ADMIN puede modificar los requisitos del catálogo.",
  })
  @ApiOperation({ summary: "Agregar un requisito adicional a un trámite" })
  @ApiParam({ name: "id", type: Number })
  @ApiCreatedResponse({ description: "Requisito agregado." })
  @ApiNotFoundResponse({ description: "El trámite no existe." })
  agregarRequisito(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CreateRequisitoTramiteDto,
  ) {
    return this.tramitesService.agregarRequisito(id, dto);
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles("ADMIN")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiForbiddenResponse({ description: "Solo ADMIN puede eliminar trámites." })
  @ApiOperation({ summary: "Eliminar un trámite" })
  @ApiParam({ name: "id", type: Number })
  @ApiNoContentResponse({ description: "Trámite eliminado." })
  @ApiNotFoundResponse({ description: "El trámite no existe." })
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.tramitesService.remove(id);
  }
}
