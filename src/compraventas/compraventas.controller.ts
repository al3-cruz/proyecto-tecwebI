import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { PermissionsGuard } from "../auth/permissions.guard.js";
import { Roles } from "../auth/roles.decorator.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { RequirePermissions } from "../auth/require-permissions.decorator.js";
import type { UsuarioAutenticado } from "../auth/interfaces/usuario-autenticado.interface.js";
import { ActualizarTramiteDto } from "./dto/actualizar-tramite.dto.js";
import { AvanzarEtapaDto } from "./dto/avanzar-etapa.dto.js";
import { CrearTramiteDto } from "./dto/crear-tramite.dto.js";
import { VerificarRequisitoDto } from "./dto/verificar-requisito.dto.js";
import { CompraventasService } from "./compraventas.service.js";

@ApiTags("Trámites de compraventa DDRR")
@ApiBearerAuth()
@Controller("compraventas")
@UseGuards(JwtAuthGuard, PermissionsGuard, RolesGuard)
export class CompraventasController {
  constructor(private readonly compraventasService: CompraventasService) {}

  @Post()
  @RequirePermissions("compraventas:crear")
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ description: "Trámite de compraventa creado." })
  crear(
    @Body() dto: CrearTramiteDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.compraventasService.crear(dto, usuario.sub);
  }

  @Get()
  @RequirePermissions("compraventas:leer")
  listar(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.compraventasService.listar(
      usuario.sub,
      usuario.roles?.includes("ADMIN") ?? false,
    );
  }

  @Get(":id")
  @RequirePermissions("compraventas:leer")
  obtener(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.compraventasService.obtener(
      id,
      usuario.sub,
      usuario.roles?.includes("ADMIN") ?? false,
    );
  }

  @Patch(":id")
  @RequirePermissions("compraventas:actualizar")
  actualizar(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ActualizarTramiteDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.compraventasService.actualizar(
      id,
      dto,
      usuario.sub,
      usuario.roles?.includes("ADMIN") ?? false,
    );
  }

  @Patch(":id/requisitos/:requisitoId/verificar")
  @Roles("ADMIN")
  @RequirePermissions("compraventas:actualizar")
  verificarRequisito(
    @Param("id", ParseIntPipe) id: number,
    @Param("requisitoId", ParseIntPipe) requisitoId: number,
    @Body() dto: VerificarRequisitoDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.compraventasService.verificarRequisito(
      id,
      requisitoId,
      dto,
      usuario.sub,
      usuario.roles?.includes("ADMIN") ?? false,
    );
  }

  @Patch(":id/confirmar-preimpresion")
  @Roles("ADMIN")
  @RequirePermissions("compraventas:actualizar")
  confirmarPreimpresion(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.compraventasService.confirmarPreimpresion(
      id,
      usuario.sub,
      usuario.roles?.includes("ADMIN") ?? false,
    );
  }

  @Patch(":id/avanzar-etapa")
  @Roles("ADMIN")
  @RequirePermissions("compraventas:avanzar_etapa")
  avanzarEtapa(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: AvanzarEtapaDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.compraventasService.avanzarEtapa(
      id,
      dto,
      usuario.sub,
      usuario.roles?.includes("ADMIN") ?? false,
    );
  }

  @Delete(":id")
  @RequirePermissions("compraventas:eliminar")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: "Trámite eliminado." })
  eliminar(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.compraventasService.eliminar(
      id,
      usuario.sub,
      usuario.roles?.includes("ADMIN") ?? false,
    );
  }
}
