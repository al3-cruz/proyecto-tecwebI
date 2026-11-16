import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ObservacionesService } from './observaciones.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ObservacionesService', () => {
  let service: ObservacionesService;
  const prismaMock = {
    tramite: {
      findUnique: jest.fn().mockResolvedValue({ id: 1 }),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ObservacionesService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<ObservacionesService>(ObservacionesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('replaces the full observation and validates its procedure', async () => {
    const original = service.findOne(1);
    const createdAt = original.fechaCreacion;

    const replacement = await service.replace(1, {
      tramiteId: 1,
      descripcion: 'Descripción reemplazada',
    });

    expect(replacement.descripcion).toBe('Descripción reemplazada');
    expect(replacement.resuelta).toBe(false);
    expect(replacement.fechaCreacion).toBe(createdAt);
    prismaMock.tramite.findUnique.mockResolvedValue(null);
    await expect(
      service.create({ tramiteId: 999, descripcion: 'Trámite inexistente' }),
    ).rejects.toThrow(NotFoundException);
  });
});
