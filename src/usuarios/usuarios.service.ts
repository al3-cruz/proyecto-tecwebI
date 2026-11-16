import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

export interface Usuario {
  id: number;
  ci: string;
  nombreCompleto: string;
  correo: string;
  telefono?: string;
  fechaRegistro: Date;
}

@Injectable()
export class UsuariosService {
  // Simulación de base de datos con un usuario inicial de prueba
  private usuarios: Usuario[] = [
    {
      id: 1,
      ci: '12345678',
      nombreCompleto: 'Juan Pérez Choque',
      correo: 'juan.perez@email.com',
      telefono: '71234567',
      fechaRegistro: new Date(),
    },
  ];

  private idCounter = 2;

  findAll(): Usuario[] {
    return this.usuarios;
  }

  findOne(id: number): Usuario {
    const usuario = this.usuarios.find((u) => u.id === id);
    if (!usuario) {
      throw new NotFoundException(`El usuario con ID ${id} no está registrado en el sistema.`);
    }
    return usuario;
  }

  create(dto: CreateUsuarioDto): Usuario {
    // Regla de negocio crucial: Evitar que dos personas se registren con el mismo CI
    const existeCi = this.usuarios.find((u) => u.ci === dto.ci);
    if (existeCi) {
      throw new ConflictException(`El documento de identidad (CI) ${dto.ci} ya se encuentra registrado.`);
    }

    const nuevoUsuario: Usuario = Object.assign({}, dto, {
      id: this.idCounter++,
      fechaRegistro: new Date(),
    });

    this.usuarios.push(nuevoUsuario);
    return nuevoUsuario;
  }

  replace(id: number, dto: CreateUsuarioDto): Usuario {
    const usuario = this.findOne(id);
    this.assertCiIsAvailable(dto.ci, id);
    const replacement: Usuario = Object.assign({}, dto, {
      id: usuario.id,
      fechaRegistro: usuario.fechaRegistro,
    });
    const index = this.usuarios.findIndex((item) => item.id === id);
    this.usuarios[index] = replacement;
    return replacement;
  }

  update(id: number, dto: UpdateUsuarioDto): Usuario {
    const usuario = this.findOne(id);
    if (dto.ci !== undefined) {
      this.assertCiIsAvailable(dto.ci, id);
    }
    Object.assign(usuario, dto);
    return usuario;
  }

  private assertCiIsAvailable(ci: string, exceptId?: number): void {
    const existeCi = this.usuarios.some((u) => u.ci === ci && u.id !== exceptId);
    if (existeCi) {
      throw new ConflictException(`El documento de identidad (CI) ${ci} ya se encuentra registrado.`);
    }
  }

  remove(id: number): void {
    const index = this.usuarios.findIndex((u) => u.id === id);
    if (index === -1) {
      throw new NotFoundException(`No se puede eliminar: el usuario con ID ${id} no existe.`);
    }
    this.usuarios.splice(index, 1);
  }
}
