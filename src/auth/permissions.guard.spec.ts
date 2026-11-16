import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service.js';
import type { UsuarioAutenticado } from './interfaces/usuario-autenticado.interface.js';
import { PermissionsGuard } from './permissions.guard.js';

describe('PermissionsGuard', () => {
  const permissions = ['tramites:crear'];
  const user: UsuarioAutenticado = {
    sub: 5,
    email: 'person@example.com',
  };
  const request = { user };
  const context = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(permissions),
  };
  const prismaMock = {
    usuario: { findUnique: jest.fn() },
  };
  let guard: PermissionsGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    reflector.getAllAndOverride.mockReturnValue(permissions);
    guard = new PermissionsGuard(
      reflector as unknown as Reflector,
      prismaMock as unknown as PrismaService,
    );
  });

  it('loads current roles and allows a granted permission', async () => {
    prismaMock.usuario.findUnique.mockResolvedValue({
      roles: [
        {
          codigo: 'CIUDADANO',
          permisos: [{ codigo: 'tramites:crear' }],
        },
      ],
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user.roles).toEqual(['CIUDADANO']);
  });

  it('denies a permission absent from the current database roles', async () => {
    prismaMock.usuario.findUnique.mockResolvedValue({
      roles: [{ codigo: 'CIUDADANO', permisos: [] }],
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
