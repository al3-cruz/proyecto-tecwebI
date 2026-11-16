import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  it('exposes an extended Prisma client while retaining the service lifecycle', async () => {
    const configService = {
      getOrThrow: jest
        .fn()
        .mockReturnValue(
          'postgresql://test:test@localhost:5432/propiedad_al_dia',
        ),
    } as unknown as ConfigService;
    const service = PrismaService.create(configService);

    expect(typeof service.tramite.findMany).toBe('function');
    expect(typeof service.$transaction).toBe('function');
    expect(typeof service.onModuleInit).toBe('function');

    await service.$disconnect();
  });
});
