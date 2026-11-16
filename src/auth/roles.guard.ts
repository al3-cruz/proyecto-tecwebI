import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service.js';
import { REQUIRED_ROLES } from './roles.decorator.js';
import type { UsuarioAutenticado } from './interfaces/usuario-autenticado.interface.js';

type RequestWithUser = Request & { user?: UsuarioAutenticado };

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_ROLES,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('No se pudo identificar al usuario.');
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: user.sub },
      select: { roles: { select: { codigo: true } } },
    });
    if (!usuario) {
      throw new ForbiddenException('El usuario ya no está disponible.');
    }

    const roles = usuario.roles.map(({ codigo }) => codigo);
    user.roles = roles;
    if (!requiredRoles.some((role) => roles.includes(role))) {
      throw new ForbiddenException(
        'No tiene el rol requerido para esta operación.',
      );
    }

    return true;
  }
}
