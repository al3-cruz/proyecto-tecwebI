import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RolesService } from './roles.service.js';

describe('RolesService', () => {
  const prisma = {
    rol: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    permiso: { findMany: jest.fn() },
  };
  let service: RolesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RolesService(prisma as unknown as PrismaService);
  });

  it('returns roles with their associated permissions', async () => {
    prisma.rol.findMany.mockResolvedValue([]);

    await service.listar();

    expect(prisma.rol.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({ permisos: expect.any(Object) }),
      }),
    );
  });

  it('replaces role permissions by code using Prisma set', async () => {
    prisma.rol.findUnique.mockResolvedValue({ id: 1 });
    prisma.permiso.findMany.mockResolvedValue([{ id: 4 }]);
    prisma.rol.update.mockResolvedValue({ id: 1, permisos: [] });

    await service.asignarPermisos(1, { codigos: ['tramites:leer'] });

    expect(prisma.rol.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: { permisos: { set: [{ id: 4 }] } },
      }),
    );
  });

  it('rejects requests without exactly one permission selector', async () => {
    await expect(
      service.asignarPermisos(1, { codigos: [], permisosIds: [] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
