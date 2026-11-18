import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateRequisitoTramiteDto,
  CreateTramiteDto,
} from "./dto/create-tramite.dto";
import { UpdateTramiteDto } from "./dto/update-tramite.dto";
import { FilterTramiteDto } from "./dto/filter-tramite.dto";
import { VerificarRequisitosDto } from "./dto/verificar-requisitos.dto";
import {
  sumarDiasHabiles,
  verificarRequisitos,
} from "./tramites-logica.helper";

const tramiteInclude = {
  requisitos: { orderBy: { orden: "asc" } },
  pasos: { orderBy: { orden: "asc" } },
  oficinas: true,
  documentosEntregables: { orderBy: { id: "asc" } },
  institucion: { select: { id: true, nombre: true } },
} satisfies Prisma.TramiteInclude;

export type TramiteConRelaciones = Prisma.TramiteGetPayload<{
  include: typeof tramiteInclude;
}>;

export interface ResultadoPaginado<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    lastPage: number;
  };
}

@Injectable()
export class TramitesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    filtros: FilterTramiteDto,
  ): Promise<ResultadoPaginado<TramiteConRelaciones>> {
    const { page, limit } = filtros;
    const search = filtros.search?.trim();
    const where: Prisma.TramiteWhereInput = {
      ...(search
        ? {
            OR: [
              { titulo: { contains: search, mode: "insensitive" } },
              { finalidad: { contains: search, mode: "insensitive" } },
              {
                requisitos: {
                  some: {
                    detalle: { contains: search, mode: "insensitive" },
                  },
                },
              },
            ],
          }
        : {}),
      ...(filtros.modalidad ? { modalidad: filtros.modalidad } : {}),
      ...(filtros.oficinaId
        ? { oficinas: { some: { id: filtros.oficinaId } } }
        : {}),
      ...(filtros.plazoMaximoDias !== undefined
        ? { plazoEntregaDias: { lte: filtros.plazoMaximoDias } }
        : {}),
    };

    try {
      const [data, total] = await Promise.all([
        this.prisma.tramite.findMany({
          where,
          include: tramiteInclude,
          orderBy: { codigo: "asc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.tramite.count({ where }),
      ]);

      return {
        data,
        meta: {
          total,
          page,
          limit,
          lastPage: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async verificarRequisitos(
    id: number,
    dto: VerificarRequisitosDto,
  ): Promise<
    ReturnType<typeof verificarRequisitos> & { fechaEstimadaEntrega: string }
  > {
    const tramite = await this.findOne(id);
    const resultado = verificarRequisitos(
      tramite.requisitos,
      dto.requisitosCumplidosIds,
    );
    const fechaInicio =
      dto.fechaInicio ?? new Date().toISOString().slice(0, 10);
    const fechaEstimadaEntrega = sumarDiasHabiles(
      fechaInicio,
      tramite.plazoEntregaDias,
    );

    return {
      ...resultado,
      fechaEstimadaEntrega: fechaEstimadaEntrega.toISOString().slice(0, 10),
    };
  }

  async obtenerEstadisticas(): Promise<{
    totalTramites: number;
    promedioPlazoDias: number;
    porModalidad: Array<{ modalidad: string; total: number }>;
    porOficina: Array<{
      id: number;
      codigoOficina: string | null;
      nombreOficina: string | null;
      totalTramites: number;
    }>;
  }> {
    try {
      const [totalTramites, promedio, modalidades, oficinas] =
        await Promise.all([
          this.prisma.tramite.count(),
          this.prisma.tramite.aggregate({
            _avg: { plazoEntregaDias: true },
          }),
          this.prisma.tramite.groupBy({
            by: ["modalidad"],
            _count: { _all: true },
            orderBy: { modalidad: "asc" },
          }),
          this.prisma.oficina.findMany({
            select: {
              id: true,
              codigoOficina: true,
              nombre: true,
              _count: {
                select: {
                  tramites: true,
                },
              },
            },
            orderBy: { id: "asc" },
          }),
        ]);

      return {
        totalTramites,
        promedioPlazoDias: Math.round(promedio._avg?.plazoEntregaDias ?? 0),
        porModalidad: modalidades.map(({ modalidad, _count }) => ({
          modalidad,
          total: typeof _count === "object" ? (_count?._all ?? 0) : 0,
        })),
        porOficina: oficinas.map((oficina) => ({
          id: oficina.id,
          codigoOficina: oficina.codigoOficina,
          nombreOficina: oficina.nombre,
          totalTramites: oficina._count.tramites,
        })),
      };
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async relacionados(id: number): Promise<TramiteConRelaciones[]> {
    const tramite = await this.findOne(id);
    const oficinaIds = tramite.oficinas.map((oficina) => oficina.id);

    try {
      return await this.prisma.tramite.findMany({
        where: {
          id: { not: id },
          OR: [
            { modalidad: tramite.modalidad },
            ...(oficinaIds.length > 0
              ? [{ oficinas: { some: { id: { in: oficinaIds } } } }]
              : []),
          ],
        },
        include: tramiteInclude,
        orderBy: { codigo: "asc" },
        take: 4,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async findOne(id: number): Promise<TramiteConRelaciones> {
    try {
      const tramite = await this.prisma.tramite.findFirst({
        where: { id },
        include: tramiteInclude,
      });
      if (!tramite) {
        throw new NotFoundException(
          `El trámite con ID ${id} no fue encontrado.`,
        );
      }
      return tramite;
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async create(
    dto: CreateTramiteDto,
    usuarioId: number,
  ): Promise<TramiteConRelaciones> {
    try {
      return await this.prisma.tramite.create({
        data: {
          tramitadorId: usuarioId,
          codigo: dto.codigo,
          codigoOficial: dto.codigoOficial ?? null,
          titulo: dto.titulo,
          institucionId: dto.institucionId,
          finalidad: dto.finalidad,
          plazoEntregaDias: dto.plazoEntregaDias,
          modalidad: dto.modalidad,
          notaRequisitos: dto.notaRequisitos ?? null,
          documentosEntregables: {
            create: (dto.documentosEntregables ?? []).map((nombre) => ({
              nombre,
            })),
          },
          baseLegal: dto.baseLegal ?? null,
          fechaActualizacionOficial: dto.fechaActualizacionOficial
            ? new Date(dto.fechaActualizacionOficial)
            : null,
          requisitos: { create: dto.requisitos ?? [] },
          pasos: { create: dto.pasos ?? [] },
          oficinas: {
            connect: (dto.oficinaIds ?? []).map((oficinaId) => ({
              id: oficinaId,
            })),
          },
        },
        include: tramiteInclude,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async replace(
    id: number,
    dto: CreateTramiteDto,
  ): Promise<TramiteConRelaciones> {
    try {
      return await this.prisma.tramite.update({
        where: { id },
        data: {
          codigo: dto.codigo,
          codigoOficial: dto.codigoOficial ?? null,
          titulo: dto.titulo,
          institucion: { connect: { id: dto.institucionId } },
          finalidad: dto.finalidad,
          plazoEntregaDias: dto.plazoEntregaDias,
          modalidad: dto.modalidad,
          notaRequisitos: dto.notaRequisitos ?? null,
          documentosEntregables: {
            deleteMany: {},
            create: (dto.documentosEntregables ?? []).map((nombre) => ({
              nombre,
            })),
          },
          baseLegal: dto.baseLegal ?? null,
          fechaActualizacionOficial: dto.fechaActualizacionOficial
            ? new Date(dto.fechaActualizacionOficial)
            : null,
          requisitos: {
            deleteMany: {},
            create: dto.requisitos ?? [],
          },
          pasos: {
            deleteMany: {},
            create: dto.pasos ?? [],
          },
          oficinas: {
            set: (dto.oficinaIds ?? []).map((oficinaId) => ({ id: oficinaId })),
          },
        },
        include: tramiteInclude,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async update(
    id: number,
    dto: UpdateTramiteDto,
  ): Promise<TramiteConRelaciones> {
    const data: Prisma.TramiteUpdateInput = {};
    if (dto.codigo !== undefined) data.codigo = dto.codigo;
    if (dto.codigoOficial !== undefined) {
      data.codigoOficial = dto.codigoOficial;
    }
    if (dto.titulo !== undefined) data.titulo = dto.titulo;
    if (dto.institucionId !== undefined) {
      data.institucion = { connect: { id: dto.institucionId } };
    }
    if (dto.finalidad !== undefined) data.finalidad = dto.finalidad;
    if (dto.plazoEntregaDias !== undefined) {
      data.plazoEntregaDias = dto.plazoEntregaDias;
    }
    if (dto.modalidad !== undefined) data.modalidad = dto.modalidad;
    if (dto.notaRequisitos !== undefined) {
      data.notaRequisitos = dto.notaRequisitos;
    }
    if (dto.documentosEntregables !== undefined) {
      data.documentosEntregables = {
        deleteMany: {},
        create: dto.documentosEntregables.map((nombre) => ({ nombre })),
      };
    }
    if (dto.baseLegal !== undefined) data.baseLegal = dto.baseLegal;
    if (dto.fechaActualizacionOficial !== undefined) {
      data.fechaActualizacionOficial = dto.fechaActualizacionOficial
        ? new Date(dto.fechaActualizacionOficial)
        : null;
    }
    if (dto.requisitos !== undefined) {
      data.requisitos = { deleteMany: {}, create: dto.requisitos };
    }
    if (dto.pasos !== undefined) {
      data.pasos = { deleteMany: {}, create: dto.pasos };
    }
    if (dto.oficinaIds !== undefined) {
      data.oficinas = {
        set: dto.oficinaIds.map((oficinaId) => ({ id: oficinaId })),
      };
    }

    try {
      return await this.prisma.tramite.update({
        where: { id },
        data,
        include: tramiteInclude,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async agregarRequisito(
    tramiteId: number,
    dto: CreateRequisitoTramiteDto,
  ): Promise<Prisma.RequisitoTramiteGetPayload<object>> {
    try {
      return await this.prisma.requisitoTramite.create({
        data: {
          nombre: dto.nombre,
          detalle: dto.detalle,
          obligatorio: dto.obligatorio,
          orden: dto.orden,
          notaCondicional: dto.notaCondicional,
          tramite: { connect: { id: tramiteId } },
        },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: number): Promise<void> {
    try {
      const result = await this.prisma.tramite.deleteMany({
        where: { id },
      });
      if (result.count === 0) {
        throw new NotFoundException(
          `El trámite con ID ${id} no fue encontrado.`,
        );
      }
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        throw new NotFoundException(
          "No se encontró el trámite, requisito u oficina solicitada.",
        );
      }
      if (error.code === "P2002" || error.code === "P2003") {
        throw new BadRequestException(
          "El código ya está registrado o alguna relación enviada no existe.",
        );
      }
    }
    throw error;
  }
}
