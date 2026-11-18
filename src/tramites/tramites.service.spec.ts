import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { TramitesService } from "./tramites.service";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "../generated/prisma/client";

describe("TramitesService", () => {
  let service: TramitesService;
  const prismaMock = {
    tramite: {
      aggregate: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    requisitoTramite: {
      create: jest.fn(),
    },
    oficina: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TramitesService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<TramitesService>(TramitesService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("replaces fields, requirements, steps, and office links in one update", async () => {
    prismaMock.tramite.findFirst.mockResolvedValue({ id: 1 });
    prismaMock.tramite.update.mockResolvedValue({ id: 1, codigo: 1 });

    await service.replace(
      1,
      {
        codigo: 1,
        titulo: "Corrección de identidad",
        finalidad: "Actualizar los datos registrales.",
        institucionId: 1,
        plazoEntregaDias: 5,
        modalidad: "PRESENCIAL",
        requisitos: [],
        pasos: [],
        oficinaIds: [2],
      },
      7,
    );

    expect(prismaMock.tramite.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({
          codigo: 1,
          requisitos: { deleteMany: {}, create: [] },
          pasos: { deleteMany: {}, create: [] },
          oficinas: { set: [{ id: 2 }] },
        }),
      }),
    );
  });

  it("returns 404 when a catalog entry does not exist", async () => {
    prismaMock.tramite.findFirst.mockResolvedValue(null);

    await expect(service.findOne(999)).rejects.toThrow("no fue encontrado");
    expect(prismaMock.tramite.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 999 } }),
    );
  });

  it("maps Prisma uniqueness conflicts to a 400 response", async () => {
    prismaMock.tramite.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique conflict", {
        code: "P2002",
        clientVersion: "7.10.1",
      }),
    );

    await expect(
      service.create(
        {
          codigo: 1,
          institucionId: 1,
          titulo: "Trámite duplicado",
          finalidad: "Prueba",
          plazoEntregaDias: 1,
          modalidad: "PRESENCIAL",
        },
        7,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("paginates the shared catalog and combines its filters", async () => {
    prismaMock.tramite.findMany.mockResolvedValue([]);
    prismaMock.tramite.count.mockResolvedValue(0);

    const result = await service.findAll({
      page: 2,
      limit: 5,
      search: "herencia",
      modalidad: "PRESENCIAL",
      oficinaId: 3,
      plazoMaximoDias: 12,
    });

    const expectedWhere = {
      OR: [
        { titulo: { contains: "herencia", mode: "insensitive" } },
        { finalidad: { contains: "herencia", mode: "insensitive" } },
        {
          requisitos: {
            some: {
              detalle: { contains: "herencia", mode: "insensitive" },
            },
          },
        },
      ],
      modalidad: "PRESENCIAL",
      oficinas: { some: { id: 3 } },
      plazoEntregaDias: { lte: 12 },
    };
    expect(prismaMock.tramite.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expectedWhere,
        skip: 5,
        take: 5,
      }),
    );
    expect(prismaMock.tramite.count).toHaveBeenCalledWith({
      where: expectedWhere,
    });
    expect(result.meta).toEqual({ total: 0, page: 2, limit: 5, lastPage: 0 });
  });

  it("verifies mandatory requirements and estimates delivery date", async () => {
    prismaMock.tramite.findFirst.mockResolvedValue({
      id: 4,
      plazoEntregaDias: 2,
      requisitos: [
        { id: 11, detalle: "Documento obligatorio", obligatorio: true },
        { id: 12, detalle: "Documento opcional", obligatorio: false },
      ],
      pasos: [],
      oficinas: [],
    });

    await expect(
      service.verificarRequisitos(
        4,
        {
          requisitosCumplidosIds: [12],
          fechaInicio: "2026-11-12",
        },
        7,
      ),
    ).resolves.toEqual({
      aptoParaIniciar: false,
      requisitosObligatoriosFaltantes: [
        { id: 11, descripcion: "Documento obligatorio" },
      ],
      requisitosOpcionalesFaltantes: [],
      porcentajeCumplimiento: 50,
      fechaEstimadaEntrega: "2026-11-16",
    });
  });

  it("returns at most four related procedures ordered by code", async () => {
    prismaMock.tramite.findFirst.mockResolvedValue({
      id: 1,
      modalidad: "MIXTA",
      requisitos: [],
      pasos: [],
      oficinas: [{ id: 5 }],
    });
    prismaMock.tramite.findMany.mockResolvedValue([]);

    await service.relacionados(1);

    expect(prismaMock.tramite.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: { not: 1 },
          OR: [
            { modalidad: "MIXTA" },
            { oficinas: { some: { id: { in: [5] } } } },
          ],
        },
        orderBy: { codigo: "asc" },
        take: 4,
      }),
    );
  });

  it("creates a catalog entry with its administrator as tramitador", async () => {
    prismaMock.tramite.create.mockResolvedValue({ id: 1, tramitadorId: 7 });

    await service.create(
      {
        codigo: 1,
        codigoOficial: "1",
        institucionId: 1,
        titulo: "Trámite nuevo",
        finalidad: "Prueba",
        plazoEntregaDias: 1,
        modalidad: "PRESENCIAL",
        notaRequisitos: "Original y dos fotocopias.",
        documentosEntregables: ["Folio Real actualizado."],
        fechaActualizacionOficial: "2025-10-27",
        requisitos: [
          {
            nombre: "Declaratoria",
            detalle: "Documento de declaratoria.",
            obligatorio: false,
            orden: 1,
            notaCondicional: "Solo en caso de fallecimiento.",
          },
        ],
      },
      7,
    );

    expect(prismaMock.tramite.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tramitadorId: 7,
          institucionId: 1,
          codigoOficial: "1",
          modalidad: "PRESENCIAL",
          notaRequisitos: "Original y dos fotocopias.",
          documentosEntregables: {
            create: [{ nombre: "Folio Real actualizado." }],
          },
          fechaActualizacionOficial: new Date("2025-10-27"),
          requisitos: {
            create: [
              expect.objectContaining({
                obligatorio: false,
                notaCondicional: "Solo en caso de fallecimiento.",
              }),
            ],
          },
        }),
      }),
    );
  });

  it("deletes the catalog entry by ID", async () => {
    prismaMock.tramite.deleteMany.mockResolvedValue({ count: 1 });

    await service.remove(10);

    expect(prismaMock.tramite.deleteMany).toHaveBeenCalledWith({
      where: { id: 10 },
    });
  });
});
