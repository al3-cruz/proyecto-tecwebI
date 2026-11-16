import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsuariosAdminService } from './usuarios-admin.service.js';

describe('UsuariosAdminService', () => {
  const prisma = {
    usuario: { findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    rol: { findMany: jest.fn() },
  };
  let service: UsuariosAdminService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsuariosAdminService(prisma as unknown as PrismaService);
  });

  it('lists active users with role fields and excludes password hashes', async () => {
    prisma.usuario.findMany.mockResolvedValue([]);

    await service.listarActivos();

    expect(prisma.usuario.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deletedAt: null },
        select: expect.objectContaining({
          id: true,
          email: true,
          roles: expect.any(Object),
        }),
      }),
    );
    expect(prisma.usuario.findMany.mock.calls[0][0].select).not.toHaveProperty(
      'passwordHash',
    );
  });

  it('replaces user roles by code using Prisma set', async () => {
    prisma.usuario.findFirst.mockResolvedValue({ id: 8 });
    prisma.rol.findMany.mockResolvedValue([{ id: 2, codigo: 'GESTOR' }]);
    prisma.usuario.update.mockResolvedValue({ id: 8, roles: [] });

    await service.asignarRoles(8, { codigos: ['GESTOR'] });

    expect(prisma.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 8 },
        data: { roles: { set: [{ id: 2 }] } },
      }),
    );
  });

  it('rejects requests that provide both role selectors', async () => {
    await expect(
      service.asignarRoles(8, { codigos: [], rolesIds: [] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
