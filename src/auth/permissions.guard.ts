import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { PrismaService } from "../prisma/prisma.service.js";
import { REQUIRED_PERMISSIONS } from "./require-permissions.decorator.js";
import type { UsuarioAutenticado } from "./interfaces/usuario-autenticado.interface.js";

type RequestWithUser = Request & { user?: UsuarioAutenticado };

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_PERMISSIONS,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException("No se pudo identificar al usuario.");
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: user.sub },
      select: {
        roles: {
          select: {
            codigo: true,
            permisos: {
              select: { permiso: { select: { codigo: true } } },
            },
          },
        },
      },
    });
    if (!usuario) {
      throw new ForbiddenException("El usuario ya no está disponible.");
    }

    const roles = usuario.roles.map((rol) => rol.codigo);
    const permissions = new Set(
      usuario.roles.flatMap((rol) =>
        rol.permisos.map(({ permiso }) => permiso.codigo),
      ),
    );
    user.roles = roles;

    if (
      !requiredPermissions.every((permission) => permissions.has(permission))
    ) {
      throw new ForbiddenException("No tiene permisos para esta operación.");
    }
    return true;
  }
}
