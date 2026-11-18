import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { DireccionesService } from "./direcciones.service";
import { CreateDireccionDto } from "./dto/create-direccion.dto";
import { UpdateDireccionDto } from "./dto/update-direccion.dto";
import { CalcularRutaGpsDto } from "./dto/calcular-ruta-gps.dto";

@ApiTags("Direcciones")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiBadRequestResponse({
  description: "Los datos enviados o una relación no son válidos.",
})
@Controller("direcciones")
export class DireccionesController {
  constructor(private readonly direccionesService: DireccionesService) {}

  @Get()
  @ApiOperation({ summary: "Listar direcciones y sus municipios" })
  @ApiOkResponse({ description: "Lista de direcciones." })
  @ApiQuery({ name: "usuarioId", required: false, type: Number })
  findAll(
    @Query("usuarioId", new ParseIntPipe({ optional: true }))
    usuarioId?: number,
  ) {
    return this.direccionesService.findAll(usuarioId);
  }

  @Get(":codigoOficina/ruta-gps")
  @ApiOperation({
    summary: "Calcular una ruta GPS hasta una oficina",
    description:
      "Consulta OSRM para obtener una ruta real; si el servicio no está disponible, devuelve la distancia Haversine y un enlace de navegación de Google Maps.",
  })
  @ApiParam({ name: "codigoOficina", example: "CHQ-SUCRE-CENTRAL" })
  @ApiQuery({
    name: "origenLatitud",
    required: true,
    example: "-19.0333",
    description: "Latitud del origen, entre -90 y 90.",
  })
  @ApiQuery({
    name: "origenLongitud",
    required: true,
    example: "-65.2627",
    description: "Longitud del origen, entre -180 y 180.",
  })
  @ApiQuery({
    name: "modo",
    required: false,
    enum: ["driving", "foot"],
    example: "driving",
  })
  @ApiOkResponse({
    description: "Ruta GPS o resultado de distancia alternativa.",
  })
  @ApiNotFoundResponse({
    description: "La oficina no existe o no tiene coordenadas GPS.",
  })
  calcularRutaGps(
    @Param("codigoOficina") codigoOficina: string,
    @Query() query: CalcularRutaGpsDto,
  ) {
    return this.direccionesService.calcularRutaGps(codigoOficina, query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtener una dirección por ID" })
  @ApiParam({ name: "id", type: Number })
  @ApiOkResponse({ description: "Dirección con su jerarquía de ubicación." })
  @ApiNotFoundResponse({ description: "La dirección no existe." })
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.direccionesService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Crear una dirección de usuario" })
  @ApiCreatedResponse({ description: "Dirección creada." })
  create(@Body() createDireccionDto: CreateDireccionDto) {
    return this.direccionesService.create(createDireccionDto);
  }

  @Put(":id")
  @ApiOperation({ summary: "Reemplazar una dirección de usuario" })
  @ApiParam({ name: "id", type: Number })
  @ApiOkResponse({ description: "Dirección reemplazada." })
  @ApiNotFoundResponse({
    description: "La dirección no existe.",
  })
  updateFull(
    @Param("id", ParseIntPipe) id: number,
    @Body() createDireccionDto: CreateDireccionDto,
  ) {
    return this.direccionesService.replace(id, createDireccionDto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Actualizar parcialmente una dirección" })
  @ApiParam({ name: "id", type: Number })
  @ApiOkResponse({ description: "Dirección actualizada." })
  @ApiNotFoundResponse({
    description: "La dirección no existe.",
  })
  updatePartial(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateDireccionDto: UpdateDireccionDto,
  ) {
    return this.direccionesService.update(id, updateDireccionDto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Eliminar una dirección" })
  @ApiParam({ name: "id", type: Number })
  @ApiNoContentResponse({ description: "Dirección eliminada." })
  @ApiNotFoundResponse({ description: "La dirección no existe." })
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.direccionesService.remove(id);
  }
}
