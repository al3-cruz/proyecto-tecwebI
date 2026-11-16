import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { AsignarPermisosDto } from './dto/asignar-permisos.dto.js';
import { RolesService } from './roles.service.js';

@ApiTags('Roles y permisos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar roles y permisos disponibles' })
  @ApiOkResponse({ description: 'Roles con permisos asociados.' })
  listar() {
    return this.rolesService.listar();
  }

  @Patch(':id/permisos')
  @ApiOperation({ summary: 'Reemplazar permisos asignados a un rol' })
  @ApiOkResponse({ description: 'Rol actualizado con sus permisos.' })
  asignarPermisos(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AsignarPermisosDto,
  ) {
    return this.rolesService.asignarPermisos(id, dto);
  }
}
