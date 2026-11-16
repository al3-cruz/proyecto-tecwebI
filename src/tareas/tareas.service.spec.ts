import { Test, TestingModule } from '@nestjs/testing';
import { TareasService } from './tareas.service';

describe('TareasService', () => {
  let service: TareasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TareasService],
    }).compile();

    service = module.get<TareasService>(TareasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('replaces the complete task and resets its managed completion state', () => {
    const replacement = service.replace(1, {
      titulo: 'Tarea reemplazada',
      descripcion: 'Descripción nueva',
    });

    expect(replacement).toEqual({
      id: 1,
      titulo: 'Tarea reemplazada',
      descripcion: 'Descripción nueva',
      completada: false,
    });
  });
});
