import { BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { RolesService } from "./roles.service.js";

describe("RolesService", () => {
  const tx = {
    rol: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    rolPermiso: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
  };
  const prisma = {
    rol: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    permiso: { findMany: jest.fn() },
    $transaction: jest.fn(
      (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx),
    ),
  };
  let service: RolesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RolesService(prisma as unknown as PrismaService);
  });

  it("returns roles with their associated permissions", async () => {
    prisma.rol.findMany.mockResolvedValue([]);

    await service.listar();

    expect(prisma.rol.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({ permisos: expect.any(Object) }),
      }),
    );
  });

  it("replaces role permissions through the explicit join model", async () => {
    tx.rol.findUnique.mockResolvedValue({ id: 1 });
    tx.rol.findUniqueOrThrow.mockResolvedValue({
      id: 1,
      codigo: "GESTOR",
      nombre: "Gestor",
      permisos: [
        {
          permiso: {
            id: 4,
            codigo: "tramites:leer",
            descripcion: "Leer trámites",
          },
        },
      ],
    });
    prisma.permiso.findMany.mockResolvedValue([{ id: 4 }]);

    await service.asignarPermisos(1, { codigos: ["tramites:leer"] });

    expect(tx.rolPermiso.deleteMany).toHaveBeenCalledWith({
      where: { rolId: 1 },
    });
    expect(tx.rolPermiso.createMany).toHaveBeenCalledWith({
      data: [{ rolId: 1, permisoId: 4 }],
    });
  });

  it("rejects requests without exactly one permission selector", async () => {
    await expect(
      service.asignarPermisos(1, { codigos: [], permisosIds: [] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
