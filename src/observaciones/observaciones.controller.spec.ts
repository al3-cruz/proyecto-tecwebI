import { Test, TestingModule } from '@nestjs/testing';
import { ObservacionesController } from './observaciones.controller';
import { ObservacionesService } from './observaciones.service';

describe('ObservacionesController', () => {
  let controller: ObservacionesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ObservacionesController],
      providers: [
        {
          provide: ObservacionesService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            replace: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ObservacionesController>(ObservacionesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
