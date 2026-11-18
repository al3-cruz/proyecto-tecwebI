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
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { EventosService } from "./eventos.service";
import { CrearEventoDto } from "./dto/crear-evento.dto";
import { ActualizarEventoDto } from "./dto/actualizar-evento.dto";

@ApiTags("Eventos")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("eventos") // Endpoint base: /api/v1/eventos
export class EventosController {
  constructor(private readonly eventosService: EventosService) {}

  @Get()
  findAll() {
    return this.eventosService.findAll();
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.eventosService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() crearEventoDto: CrearEventoDto) {
    return this.eventosService.create(crearEventoDto);
  }

  @Put(":id")
  updateFull(
    @Param("id", ParseIntPipe) id: number,
    @Body() crearEventoDto: CrearEventoDto,
  ) {
    return this.eventosService.replace(id, crearEventoDto);
  }

  @Patch(":id")
  updatePartial(
    @Param("id", ParseIntPipe) id: number,
    @Body() actualizarEventoDto: ActualizarEventoDto,
  ) {
    return this.eventosService.update(id, actualizarEventoDto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.eventosService.remove(id);
  }
}
