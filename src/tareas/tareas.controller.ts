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
} from '@nestjs/common';
import { TareasService } from './tareas.service';
import { CrearTareaDto } from './dto/crear-tarea.dto';
import { ActualizarTareaDto } from './dto/actualizar-tarea.dto';

@Controller('tareas') // Endpoint base: /api/v1/tareas
export class TareasController {
  constructor(private readonly tareasService: TareasService) {}

  @Get()
  findAll() {
    return this.tareasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tareasService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() crearTareaDto: CrearTareaDto) {
    return this.tareasService.create(crearTareaDto);
  }

  @Put(':id')
  updateFull(@Param('id', ParseIntPipe) id: number, @Body() crearTareaDto: CrearTareaDto) {
    return this.tareasService.replace(id, crearTareaDto);
  }

  @Patch(':id')
  updatePartial(@Param('id', ParseIntPipe) id: number, @Body() actualizarTareaDto: ActualizarTareaDto) {
    return this.tareasService.update(id, actualizarTareaDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT) // Retorna un 204 exitoso sin cuerpo
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tareasService.remove(id);
  }
}
