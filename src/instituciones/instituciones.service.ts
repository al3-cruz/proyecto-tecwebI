import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { CreateInstitucionDto } from "./dto/create-institucion.dto.js";

@Injectable()
export class InstitucionesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.institucion.findMany({
      orderBy: { nombre: "asc" },
    });
  }

  async create(dto: CreateInstitucionDto) {
    try {
      return await this.prisma.institucion.create({
        data: { nombre: dto.nombre },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          "Ya existe una institución con ese nombre.",
        );
      }
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    try {
      await this.prisma.institucion.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new NotFoundException(`La institución con ID ${id} no existe.`);
        }
        if (error.code === "P2003") {
          throw new ConflictException(
            "No se puede eliminar una institución que tiene trámites asociados.",
          );
        }
      }
      throw error;
    }
  }
}
