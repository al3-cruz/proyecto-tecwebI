import { Test, TestingModule } from '@nestjs/testing';
import { TramitesController } from './tramites.controller';
import { TramitesService } from './tramites.service';
import { JwtService } from '@nestjs/jwt';

describe('TramitesController', () => {
  let controller: TramitesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TramitesController],
      providers: [
        { provide: JwtService, useValue: { verifyAsync: jest.fn() } },
        {
          provide: TramitesService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            replace: jest.fn(),
            update: jest.fn(),
            agregarRequisito: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TramitesController>(TramitesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
