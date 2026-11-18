import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { DireccionesService } from "./direcciones.service";
import { calcularDistanciaHaversine } from "./ruta-gps.helper";

describe("DireccionesService", () => {
  let service: DireccionesService;
  const prismaMock = {
    direccion: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    oficina: {
      findUnique: jest.fn(),
    },
    ubicacion: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.ubicacion.findFirst.mockResolvedValue({ id: 3 });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DireccionesService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<DireccionesService>(DireccionesService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("filters addresses by user and includes the location hierarchy", async () => {
    prismaMock.direccion.findMany.mockResolvedValue([]);

    await service.findAll(7);

    expect(prismaMock.direccion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { usuarioId: 7 },
        include: expect.objectContaining({
          municipio: expect.objectContaining({
            select: expect.objectContaining({
              nombre: true,
              padre: expect.any(Object),
            }),
          }),
        }),
      }),
    );
  });

  it("creates a personal address linked to a municipality", async () => {
    prismaMock.direccion.create.mockResolvedValue({ id: 8 });

    await service.create({
      municipioId: 3,
      zonaOComunidad: "Centro",
      calleOAvenida: "Avenida central",
    });

    expect(prismaMock.direccion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          municipioId: 3,
          usuarioId: null,
        }),
      }),
    );
  });

  it("replaces address fields and municipality", async () => {
    prismaMock.direccion.update.mockResolvedValue({ id: 5 });

    await service.replace(5, {
      municipioId: 3,
      zonaOComunidad: "Centro",
      calleOAvenida: "Avenida nueva",
    });

    expect(prismaMock.direccion.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 5 },
        data: expect.objectContaining({
          numeroPuerta: null,
          municipioId: 3,
        }),
      }),
    );
  });

  it("maps a missing address to 404", async () => {
    prismaMock.direccion.findUnique.mockResolvedValue(null);

    await expect(service.findOne(404)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it.each(["P2002", "P2003"])("maps Prisma error %s to 400", async (code) => {
    prismaMock.direccion.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Invalid relation", {
        code,
        clientVersion: "7.10.1",
      }),
    );

    await expect(
      service.create({
        municipioId: 3,
        zonaOComunidad: "Centro",
        calleOAvenida: "Calle prueba",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("maps Prisma error P2025 to 404", async () => {
    prismaMock.direccion.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Record not found", {
        code: "P2025",
        clientVersion: "7.10.1",
      }),
    );

    await expect(
      service.update(999, { municipioId: 3 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  describe("calcularRutaGps", () => {
    const oficina = {
      id: 1,
      codigoOficina: "CHQ-SUCRE-CENTRAL",
      nombre: "Oficina Central de Sucre",
      direccion: "Av. Venezuela esq. Ladislao Cabrera",
      municipio: {
        nombre: "Sucre",
        padre: {
          nombre: "Oropeza",
          padre: { nombre: "Chuquisaca" },
        },
      },
      latitud: -19.04295,
      longitud: -65.25548,
    };
    const origen = {
      origenLatitud: "-19.0333",
      origenLongitud: "-65.2627",
      modo: "driving" as const,
    };

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("returns OSRM route data and Google Maps navigation URL", async () => {
      prismaMock.oficina.findUnique.mockResolvedValue(oficina);
      jest.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify({
            code: "Ok",
            routes: [
              {
                distance: 1800,
                duration: 360,
                geometry: {
                  type: "LineString",
                  coordinates: [
                    [-65.2627, -19.0333],
                    [-65.25548, -19.04295],
                  ],
                },
                legs: [
                  {
                    steps: [
                      {
                        distance: 1800,
                        duration: 360,
                        name: "Av. Venezuela",
                        maneuver: { type: "turn", modifier: "right" },
                      },
                    ],
                  },
                ],
              },
            ],
          }),
          { status: 200 },
        ),
      );

      const resultado = await service.calcularRutaGps(
        "CHQ-SUCRE-CENTRAL",
        origen,
      );

      expect(resultado.distanciaMetros).toBe(1800);
      expect(resultado.duracionSegundos).toBe(360);
      expect(resultado.pasosNavegacion[0]).toEqual({
        instrucciones: "turn right",
        nombreCalle: "Av. Venezuela",
        distanciaMetros: 1800,
        duracionSegundos: 360,
      });
      expect(resultado.googleMapsUrl).toContain("travelmode=driving");
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          "/route/v1/driving/-65.2627,-19.0333;-65.25548,-19.04295",
        ),
        expect.any(Object),
      );
    });

    it("uses Haversine fallback when OSRM is unavailable", async () => {
      prismaMock.oficina.findUnique.mockResolvedValue(oficina);
      jest
        .spyOn(globalThis, "fetch")
        .mockRejectedValue(new Error("OSRM unavailable"));

      const resultado = await service.calcularRutaGps(
        "CHQ-SUCRE-CENTRAL",
        origen,
      );

      expect(resultado.distanciaMetros).toBe(
        calcularDistanciaHaversine(
          { latitud: -19.0333, longitud: -65.2627 },
          { latitud: oficina.latitud, longitud: oficina.longitud },
        ),
      );
      expect(resultado.duracionSegundos).toBeNull();
      expect(resultado.geometriaGeoJson).toBeNull();
      expect(resultado.pasosNavegacion).toEqual([]);
      expect(resultado.googleMapsUrl).toContain("travelmode=driving");
    });

    it("returns 404 when the office does not exist", async () => {
      prismaMock.oficina.findUnique.mockResolvedValue(null);
      const fetchMock = jest.spyOn(globalThis, "fetch");

      await expect(
        service.calcularRutaGps("MISSING", origen),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("returns 404 when the office has no GPS coordinates", async () => {
      prismaMock.oficina.findUnique.mockResolvedValue({
        ...oficina,
        latitud: null,
      });
      const fetchMock = jest.spyOn(globalThis, "fetch");

      await expect(
        service.calcularRutaGps("CHQ-SUCRE-CENTRAL", origen),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
