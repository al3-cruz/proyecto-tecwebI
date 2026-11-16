import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AsignarPermisosDto } from './dto/asignar-permisos.dto.js';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  listar() {
    return this.prisma.rol.findMany({
      select: {
        id: true,
        codigo: true,
        nombre: true,
        permisos: {
          select: { id: true, codigo: true, descripcion: true },
          orderBy: { id: 'asc' },
        },
      },
      orderBy: { id: 'asc' },
    });
  }

  async asignarPermisos(id: number, dto: AsignarPermisosDto) {
    const permissionSelector = this.getPermissionSelector(dto);
    const rol = await this.prisma.rol.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!rol) {
      throw new NotFoundException(`El rol ${id} no existe.`);
    }

    const permisos = await this.prisma.permiso.findMany({
      where: permissionSelector.where,
      select: { id: true },
    });
    if (permisos.length !== permissionSelector.count) {
      throw new BadRequestException('Uno o más permisos no existen.');
    }

    return this.prisma.rol.update({
      where: { id },
      data: {
        permisos: {
          set: permisos.map(({ id: permissionId }) => ({ id: permissionId })),
        },
      },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        permisos: {
          select: { id: true, codigo: true, descripcion: true },
          orderBy: { id: 'asc' },
        },
      },
    });
  }

  private getPermissionSelector(
    dto: AsignarPermisosDto,
  ):
    | { where: { id: { in: number[] } }; count: number }
    | { where: { codigo: { in: string[] } }; count: number } {
    const hasIds = dto.permisosIds !== undefined;
    const hasCodes = dto.codigos !== undefined;
    if (hasIds === hasCodes) {
      throw new BadRequestException(
        'Proporcione exactamente uno de estos campos: permisosIds o codigos.',
      );
    }
    if (dto.permisosIds) {
      return {
        where: { id: { in: dto.permisosIds } },
        count: dto.permisosIds.length,
      };
    }
    const codigos = dto.codigos ?? [];
    return { where: { codigo: { in: codigos } }, count: codigos.length };
  }
}
