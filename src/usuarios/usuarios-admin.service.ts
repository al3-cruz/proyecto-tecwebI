import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AsignarRolesDto } from './dto/asignar-roles.dto.js';

@Injectable()
export class UsuariosAdminService {
  constructor(private readonly prisma: PrismaService) {}

  listarActivos() {
    return this.prisma.usuario.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        email: true,
        createdAt: true,
        roles: {
          select: { id: true, codigo: true, nombre: true },
          orderBy: { id: 'asc' },
        },
      },
      orderBy: { id: 'asc' },
    });
  }

  async asignarRoles(id: number, dto: AsignarRolesDto) {
    const roleSelector = this.getRoleSelector(dto);
    const usuario = await this.prisma.usuario.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!usuario) {
      throw new NotFoundException(
        `El usuario ${id} no existe o está inactivo.`,
      );
    }

    const roles = await this.prisma.rol.findMany({
      where: roleSelector.where,
      select: { id: true, codigo: true, nombre: true },
    });
    if (roles.length !== roleSelector.count) {
      throw new BadRequestException('Uno o más roles no existen.');
    }

    return this.prisma.usuario.update({
      where: { id },
      data: { roles: { set: roles.map(({ id: roleId }) => ({ id: roleId })) } },
      select: {
        id: true,
        email: true,
        roles: {
          select: { id: true, codigo: true, nombre: true },
          orderBy: { id: 'asc' },
        },
      },
    });
  }

  private getRoleSelector(
    dto: AsignarRolesDto,
  ):
    | { where: { id: { in: number[] } }; count: number }
    | { where: { codigo: { in: string[] } }; count: number } {
    const hasIds = dto.rolesIds !== undefined;
    const hasCodes = dto.codigos !== undefined;
    if (hasIds === hasCodes) {
      throw new BadRequestException(
        'Proporcione exactamente uno de estos campos: rolesIds o codigos.',
      );
    }
    if (dto.rolesIds) {
      return {
        where: { id: { in: dto.rolesIds } },
        count: dto.rolesIds.length,
      };
    }
    const codigos = dto.codigos ?? [];
    return { where: { codigo: { in: codigos } }, count: codigos.length };
  }
}
