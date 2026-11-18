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
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { ObservacionesService } from "./observaciones.service";
import { CreateObservacionDto } from "./dto/create-observacion.dto";
import { UpdateObservacionDto } from "./dto/update-observacion.dto";
@ApiTags("Observaciones")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("observaciones")
export class ObservacionesController {
  constructor(private readonly obsService: ObservacionesService) {}

  @Get()
  findAll(
    @Query("tramiteId", new ParseIntPipe({ optional: true }))
    tramiteId?: number,
  ) {
    // Permite usar filtros inteligentes en la URL: /observaciones?tramiteId=1
    return this.obsService.findAll(tramiteId);
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.obsService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateObservacionDto) {
    return this.obsService.create(dto);
  }

  @Put(":id")
  replace(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CreateObservacionDto,
  ) {
    return this.obsService.replace(id, dto);
  }

  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateObservacionDto: UpdateObservacionDto,
  ) {
    return this.obsService.update(id, updateObservacionDto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.obsService.remove(id);
  }
}
