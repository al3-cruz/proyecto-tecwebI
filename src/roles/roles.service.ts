import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { AsignarPermisosDto } from "./dto/asignar-permisos.dto.js";

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  listar() {
    return this.prisma.rol
      .findMany({
        select: {
          id: true,
          codigo: true,
          nombre: true,
          permisos: {
            select: {
              permiso: {
                select: { id: true, codigo: true, descripcion: true },
              },
            },
            orderBy: { permisoId: "asc" },
          },
        },
        orderBy: { id: "asc" },
      })
      .then((roles) =>
        roles.map(({ permisos, ...rol }) => ({
          ...rol,
          permisos: permisos.map(({ permiso }) => permiso),
        })),
      );
  }

  async asignarPermisos(id: number, dto: AsignarPermisosDto) {
    const permissionSelector = this.getPermissionSelector(dto);
    const permisos = await this.prisma.permiso.findMany({
      where: permissionSelector.where,
      select: { id: true },
    });
    if (permisos.length !== permissionSelector.count) {
      throw new BadRequestException("Uno o más permisos no existen.");
    }

    return this.prisma.$transaction(async (tx) => {
      const rol = await tx.rol.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!rol) {
        throw new NotFoundException(`El rol ${id} no existe.`);
      }

      await tx.rolPermiso.deleteMany({ where: { rolId: id } });
      if (permisos.length > 0) {
        await tx.rolPermiso.createMany({
          data: permisos.map(({ id: permisoId }) => ({
            rolId: id,
            permisoId,
          })),
        });
      }

      const actualizado = await tx.rol.findUniqueOrThrow({
        where: { id },
        select: {
          id: true,
          codigo: true,
          nombre: true,
          permisos: {
            select: {
              permiso: {
                select: { id: true, codigo: true, descripcion: true },
              },
            },
            orderBy: { permisoId: "asc" },
          },
        },
      });
      return {
        ...actualizado,
        permisos: actualizado.permisos.map(({ permiso }) => permiso),
      };
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
        "Proporcione exactamente uno de estos campos: permisosIds o codigos.",
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
