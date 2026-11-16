import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service.js';
import type { UsuarioAutenticado } from './interfaces/usuario-autenticado.interface.js';
import { RolesGuard } from './roles.guard.js';

describe('RolesGuard', () => {
  const user: UsuarioAutenticado = {
    sub: 5,
    email: 'admin@example.com',
  };
  const request = { user };
  const context = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']) };
  const prismaMock = { usuario: { findUnique: jest.fn() } };
  let guard: RolesGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    reflector.getAllAndOverride.mockReturnValue(['ADMIN']);
    guard = new RolesGuard(
      reflector as unknown as Reflector,
      prismaMock as unknown as PrismaService,
    );
  });

  it('loads current roles from Prisma and permits an assigned role', async () => {
    prismaMock.usuario.findUnique.mockResolvedValue({
      roles: [{ codigo: 'ADMIN' }],
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user.roles).toEqual(['ADMIN']);
  });

  it('rejects users without a required role', async () => {
    prismaMock.usuario.findUnique.mockResolvedValue({
      roles: [{ codigo: 'GESTOR' }],
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
