import { ConflictException, NotFoundException } from "@nestjs/common";
import { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { InstitucionesService } from "./instituciones.service.js";

describe("InstitucionesService", () => {
  const prisma = {
    institucion: {
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  };
  let service: InstitucionesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InstitucionesService(prisma as unknown as PrismaService);
  });

  it("lists institutions by name", async () => {
    prisma.institucion.findMany.mockResolvedValue([]);

    await service.findAll();

    expect(prisma.institucion.findMany).toHaveBeenCalledWith({
      orderBy: { nombre: "asc" },
    });
  });

  it("creates an institution", async () => {
    prisma.institucion.create.mockResolvedValue({ id: 1, nombre: "DDRR" });

    await expect(service.create({ nombre: "DDRR" })).resolves.toEqual({
      id: 1,
      nombre: "DDRR",
    });
  });

  it("maps duplicate institution names to 409", async () => {
    prisma.institucion.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Duplicate", {
        code: "P2002",
        clientVersion: "7.10.1",
      }),
    );

    await expect(service.create({ nombre: "DDRR" })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it("maps missing institutions to 404 on deletion", async () => {
    prisma.institucion.delete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Missing record", {
        code: "P2025",
        clientVersion: "7.10.1",
      }),
    );

    await expect(service.remove(404)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("prevents deleting institutions referenced by catalog entries", async () => {
    prisma.institucion.delete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Foreign key constraint", {
        code: "P2003",
        clientVersion: "7.10.1",
      }),
    );

    await expect(service.remove(1)).rejects.toBeInstanceOf(ConflictException);
  });
});
