import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class UbicacionesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(padreId?: number) {
    return this.prisma.ubicacion.findMany({
      where: { padreId: padreId ?? null },
      orderBy: { nombre: "asc" },
    });
  }
}
