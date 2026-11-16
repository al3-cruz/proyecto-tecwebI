import { Test, TestingModule } from '@nestjs/testing';
import { UsuariosService } from './usuarios.service';

describe('UsuariosService', () => {
  let service: UsuariosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsuariosService],
    }).compile();

    service = module.get<UsuariosService>(UsuariosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('replaces all editable fields and preserves the record metadata', () => {
    const original = service.findOne(1);
    const registeredAt = original.fechaRegistro;

    const replacement = service.replace(1, {
      ci: '12345678',
      nombreCompleto: 'Juan Pérez Choque',
      correo: 'juan.perez@email.com',
    });

    expect(replacement).not.toHaveProperty('telefono');
    expect(replacement.id).toBe(1);
    expect(replacement.fechaRegistro).toBe(registeredAt);
  });

  it('rejects a CI already owned by another user', () => {
    const anotherUser = service.create({
      ci: '87654321',
      nombreCompleto: 'Otro usuario',
      correo: 'otro@example.com',
    });

    expect(() =>
      service.replace(1, {
        ci: anotherUser.ci,
        nombreCompleto: 'Juan Pérez Choque',
        correo: 'juan.perez@email.com',
      }),
    ).toThrow();
  });
});
