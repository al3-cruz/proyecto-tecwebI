import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DireccionesService } from './direcciones.service';
import { calcularDistanciaHaversine } from './ruta-gps.helper';

describe('DireccionesService', () => {
  let service: DireccionesService;
  const prismaMock = {
    direccion: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DireccionesService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<DireccionesService>(DireccionesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('filters addresses by user and includes related procedures', async () => {
    prismaMock.direccion.findMany.mockResolvedValue([]);

    await service.findAll(7);

    expect(prismaMock.direccion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { usuarioId: 7 },
        include: {
          tramites: {
            select: { id: true, codigo: true, titulo: true },
            orderBy: { codigo: 'asc' },
          },
        },
      }),
    );
  });

  it('connects procedures when creating an address', async () => {
    prismaMock.direccion.create.mockResolvedValue({ id: 8, tramites: [] });

    await service.create({
      codigoOficina: 'LPZ-CENTRAL',
      nombreOficina: 'Oficina La Paz',
      departamento: 'La Paz',
      provincia: 'Murillo',
      municipio: 'La Paz',
      zonaOComunidad: 'Centro',
      calleOAvenida: 'Avenida central',
      tramiteIds: [2, 4],
    });

    expect(prismaMock.direccion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          codigoOficina: 'LPZ-CENTRAL',
          tramites: { connect: [{ id: 2 }, { id: 4 }] },
        }),
      }),
    );
  });

  it('replaces address fields and sets the full procedure relation list', async () => {
    prismaMock.direccion.update.mockResolvedValue({ id: 5, tramites: [] });

    await service.replace(5, {
      departamento: 'La Paz',
      provincia: 'Murillo',
      municipio: 'La Paz',
      zonaOComunidad: 'Centro',
      calleOAvenida: 'Avenida nueva',
      tramiteIds: [3],
    });

    expect(prismaMock.direccion.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 5 },
        data: expect.objectContaining({
          numeroPuerta: null,
          tramites: { set: [{ id: 3 }] },
        }),
      }),
    );
  });

  it('maps a missing address to 404', async () => {
    prismaMock.direccion.findUnique.mockResolvedValue(null);

    await expect(service.findOne(404)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it.each(['P2002', 'P2003'])('maps Prisma error %s to 400', async (code) => {
    prismaMock.direccion.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Invalid relation', {
        code,
        clientVersion: '7.10.1',
      }),
    );

    await expect(
      service.create({
        departamento: 'La Paz',
        provincia: 'Murillo',
        municipio: 'La Paz',
        zonaOComunidad: 'Centro',
        calleOAvenida: 'Calle prueba',
        tramiteIds: [999],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('maps Prisma error P2025 to 404', async () => {
    prismaMock.direccion.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '7.10.1',
      }),
    );

    await expect(
      service.update(999, { nombreOficina: 'Oficina actualizada' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  describe('calcularRutaGps', () => {
    const oficina = {
      id: 1,
      codigoOficina: 'CHQ-SUCRE-CENTRAL',
      nombreOficina: 'Oficina Central de Sucre',
      departamento: 'Chuquisaca',
      provincia: 'Oropeza',
      municipio: 'Sucre',
      calleOAvenida: 'Av. Venezuela esq. Ladislao Cabrera',
      numeroPuerta: 'S/N',
      latitud: -19.04295,
      longitud: -65.25548,
    };
    const origen = {
      origenLatitud: '-19.0333',
      origenLongitud: '-65.2627',
      modo: 'driving' as const,
    };

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('returns OSRM route data and Google Maps navigation URL', async () => {
      prismaMock.direccion.findUnique.mockResolvedValue(oficina);
      jest.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            code: 'Ok',
            routes: [
              {
                distance: 1800,
                duration: 360,
                geometry: {
                  type: 'LineString',
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
                        name: 'Av. Venezuela',
                        maneuver: { type: 'turn', modifier: 'right' },
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
        'CHQ-SUCRE-CENTRAL',
        origen,
      );

      expect(resultado.distanciaMetros).toBe(1800);
      expect(resultado.duracionSegundos).toBe(360);
      expect(resultado.pasosNavegacion[0]).toEqual({
        instrucciones: 'turn right',
        nombreCalle: 'Av. Venezuela',
        distanciaMetros: 1800,
        duracionSegundos: 360,
      });
      expect(resultado.googleMapsUrl).toContain('travelmode=driving');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          '/route/v1/driving/-65.2627,-19.0333;-65.25548,-19.04295',
        ),
        expect.any(Object),
      );
    });

    it('uses Haversine fallback when OSRM is unavailable', async () => {
      prismaMock.direccion.findUnique.mockResolvedValue(oficina);
      jest
        .spyOn(globalThis, 'fetch')
        .mockRejectedValue(new Error('OSRM unavailable'));

      const resultado = await service.calcularRutaGps(
        'CHQ-SUCRE-CENTRAL',
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
      expect(resultado.googleMapsUrl).toContain('travelmode=driving');
    });

    it('returns 404 when the office does not exist', async () => {
      prismaMock.direccion.findUnique.mockResolvedValue(null);
      const fetchMock = jest.spyOn(globalThis, 'fetch');

      await expect(
        service.calcularRutaGps('MISSING', origen),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('returns 404 when the office has no GPS coordinates', async () => {
      prismaMock.direccion.findUnique.mockResolvedValue({
        ...oficina,
        latitud: null,
      });
      const fetchMock = jest.spyOn(globalThis, 'fetch');

      await expect(
        service.calcularRutaGps('CHQ-SUCRE-CENTRAL', origen),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
