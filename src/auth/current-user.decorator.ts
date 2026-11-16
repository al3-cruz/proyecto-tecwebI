import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { UsuarioAutenticado } from './interfaces/usuario-autenticado.interface.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): UsuarioAutenticado => {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user: UsuarioAutenticado }>();
    return request.user;
  },
);
