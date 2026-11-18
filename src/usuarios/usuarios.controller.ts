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
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { Roles } from "../auth/roles.decorator.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { UsuariosService } from "./usuarios.service";
import { UsuariosAdminService } from "./usuarios-admin.service.js";
import { AsignarRolesDto } from "./dto/asignar-roles.dto.js";
import { CreateUsuarioDto } from "./dto/create-usuario.dto";
import { UpdateUsuarioDto } from "./dto/update-usuario.dto";

@ApiTags("Usuarios")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
@Controller("usuarios") // Ruta: /api/v1/usuarios
export class UsuariosController {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly usuariosAdminService: UsuariosAdminService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Listar usuarios activos con roles asignados" })
  @ApiOkResponse({ description: "Usuarios sin hashes de contraseñas." })
  findAll() {
    return this.usuariosAdminService.listarActivos();
  }

  @Patch(":id/roles")
  @ApiOperation({ summary: "Reemplazar los roles de un usuario" })
  @ApiOkResponse({ description: "Usuario actualizado con sus roles." })
  asignarRoles(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: AsignarRolesDto,
  ) {
    return this.usuariosAdminService.asignarRoles(id, dto);
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.usuariosService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createUsuarioDto: CreateUsuarioDto) {
    return this.usuariosService.create(createUsuarioDto);
  }

  @Put(":id")
  updateFull(
    @Param("id", ParseIntPipe) id: number,
    @Body() createUsuarioDto: CreateUsuarioDto,
  ) {
    return this.usuariosService.replace(id, createUsuarioDto);
  }

  @Patch(":id")
  updatePartial(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateUsuarioDto: UpdateUsuarioDto,
  ) {
    return this.usuariosService.update(id, updateUsuarioDto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.usuariosService.remove(id);
  }
}
