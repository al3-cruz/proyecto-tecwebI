import { Test, TestingModule } from '@nestjs/testing';
import { EventosService } from './eventos.service';

describe('EventosService', () => {
  let service: EventosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EventosService],
    }).compile();

    service = module.get<EventosService>(EventosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('replaces all editable event fields', () => {
    const replacement = service.replace(1, {
      nombre: 'Evento actualizado',
      fecha: '2026-12-20',
      ubicacion: 'Nueva ubicación',
    });

    expect(replacement).toEqual({
      id: 1,
      nombre: 'Evento actualizado',
      fecha: '2026-12-20',
      ubicacion: 'Nueva ubicación',
    });
  });
});
