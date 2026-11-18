import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { JsonWebTokenError } from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service.js';
import type { UsuarioAutenticado } from './interfaces/usuario-autenticado.interface.js';

type RequestWithUser = Request & { user?: UsuarioAutenticado };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const authorization = request.headers.authorization;
    const [scheme, token, extra] = authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token || extra) {
      throw new UnauthorizedException('Se requiere un token Bearer válido.');
    }

    let payload: UsuarioAutenticado;
    try {
      payload = await this.jwtService.verifyAsync<UsuarioAutenticado>(token);
    } catch (error) {
      if (error instanceof JsonWebTokenError) {
        throw new UnauthorizedException('El token no es válido o expiró.');
      }
      throw error;
    }

    if (
      !Number.isInteger(payload.sub) ||
      payload.sub < 1 ||
      typeof payload.email !== 'string'
    ) {
      throw new UnauthorizedException('El token no contiene un usuario válido.');
    }

    const usuarioActivo = await this.prisma.usuario.findFirst({
      where: { id: payload.sub, deletedAt: null },
      select: { id: true },
    });
    if (!usuarioActivo) {
      throw new UnauthorizedException('La cuenta ya no está disponible.');
    }

    request.user = payload;
    return true;
  }
}
