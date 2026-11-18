import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateDireccionDto } from "./dto/create-direccion.dto";
import { UpdateDireccionDto } from "./dto/update-direccion.dto";
import { CalcularRutaGpsDto } from "./dto/calcular-ruta-gps.dto";
import {
  calcularDistanciaHaversine,
  crearGoogleMapsUrl,
  type GeometriaGeoJson,
  type PasoNavegacion,
  type ResultadoRutaGps,
} from "./ruta-gps.helper";

export interface OficinaRutaGps {
  id: number;
  codigoOficina: string | null;
  nombreOficina: string | null;
  departamento: string;
  provincia: string;
  municipio: string;
  calleOAvenida: string;
  numeroPuerta: string | null;
  latitud: number | null;
  longitud: number | null;
}

interface OsrmManeuver {
  type: string;
  modifier?: string;
}

interface OsrmStep {
  distance: number;
  duration: number;
  name: string;
  maneuver: OsrmManeuver;
}

interface OsrmLeg {
  steps: OsrmStep[];
}

interface OsrmRoute {
  distance: number;
  duration: number;
  geometry: GeometriaGeoJson;
  legs: OsrmLeg[];
}

interface OsrmResponse {
  code: string;
  routes: OsrmRoute[];
}

const direccionInclude = {
  municipio: {
    select: {
      id: true,
      nombre: true,
      tipo: true,
      padre: {
        select: {
          id: true,
          nombre: true,
          tipo: true,
          padre: {
            select: { id: true, nombre: true, tipo: true },
          },
        },
      },
    },
  },
} satisfies Prisma.DireccionInclude;

export type DireccionConMunicipio = Prisma.DireccionGetPayload<{
  include: typeof direccionInclude;
}>;

@Injectable()
export class DireccionesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(usuarioId?: number): Promise<DireccionConMunicipio[]> {
    try {
      return await this.prisma.direccion.findMany({
        where: usuarioId === undefined ? undefined : { usuarioId },
        include: direccionInclude,
        orderBy: { id: "asc" },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async findOne(id: number): Promise<DireccionConMunicipio> {
    try {
      const direccion = await this.prisma.direccion.findUnique({
        where: { id },
        include: direccionInclude,
      });
      if (!direccion) {
        throw new NotFoundException(
          `La dirección con ID ${id} no está registrada en el sistema.`,
        );
      }
      return direccion;
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async calcularRutaGps(
    codigoOficina: string,
    dto: CalcularRutaGpsDto,
  ): Promise<{
    oficina: OficinaRutaGps;
    origen: { latitud: number; longitud: number };
    destino: { latitud: number; longitud: number };
    distanciaMetros: number;
    duracionSegundos: number | null;
    geometriaGeoJson: GeometriaGeoJson | null;
    pasosNavegacion: PasoNavegacion[];
    googleMapsUrl: string;
  }> {
    const oficinaRegistro = await this.prisma.oficina.findUnique({
      where: { codigoOficina },
      select: {
        id: true,
        codigoOficina: true,
        nombre: true,
        direccion: true,
        latitud: true,
        longitud: true,
        municipio: {
          select: {
            nombre: true,
            padre: {
              select: {
                nombre: true,
                padre: { select: { nombre: true } },
              },
            },
          },
        },
      },
    });
    if (!oficinaRegistro) {
      throw new NotFoundException(
        `La oficina con código ${codigoOficina} no existe.`,
      );
    }
    const oficina: OficinaRutaGps = {
      id: oficinaRegistro.id,
      codigoOficina: oficinaRegistro.codigoOficina,
      nombreOficina: oficinaRegistro.nombre,
      departamento: oficinaRegistro.municipio.padre?.padre?.nombre ?? "",
      provincia: oficinaRegistro.municipio.padre?.nombre ?? "",
      municipio: oficinaRegistro.municipio.nombre,
      calleOAvenida: oficinaRegistro.direccion,
      numeroPuerta: null,
      latitud: oficinaRegistro.latitud,
      longitud: oficinaRegistro.longitud,
    };
    if (oficina.latitud === null || oficina.longitud === null) {
      throw new NotFoundException(
        `La oficina con código ${codigoOficina} no tiene coordenadas GPS.`,
      );
    }

    const origen = {
      latitud: Number(dto.origenLatitud),
      longitud: Number(dto.origenLongitud),
    };
    const destino = {
      latitud: oficina.latitud,
      longitud: oficina.longitud,
    };
    const googleMapsUrl = crearGoogleMapsUrl(origen, destino, dto.modo);
    const rutaOsrm = await this.consultarOsrm(origen, destino, dto.modo);

    const resultado: ResultadoRutaGps = rutaOsrm
      ? {
          ...rutaOsrm,
          googleMapsUrl,
        }
      : {
          distanciaMetros: calcularDistanciaHaversine(origen, destino),
          duracionSegundos: null,
          geometriaGeoJson: null,
          pasosNavegacion: [],
          googleMapsUrl,
        };

    return {
      oficina,
      origen,
      destino,
      ...resultado,
    };
  }

  async create(dto: CreateDireccionDto): Promise<DireccionConMunicipio> {
    try {
      await this.assertMunicipio(dto.municipioId);
      return await this.prisma.direccion.create({
        data: {
          usuarioId: dto.usuarioId ?? null,
          municipioId: dto.municipioId,
          zonaOComunidad: dto.zonaOComunidad,
          calleOAvenida: dto.calleOAvenida,
          numeroPuerta: dto.numeroPuerta ?? null,
        },
        include: direccionInclude,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async replace(
    id: number,
    dto: CreateDireccionDto,
  ): Promise<DireccionConMunicipio> {
    try {
      await this.assertMunicipio(dto.municipioId);
      return await this.prisma.direccion.update({
        where: { id },
        data: {
          usuarioId: dto.usuarioId ?? null,
          municipioId: dto.municipioId,
          zonaOComunidad: dto.zonaOComunidad,
          calleOAvenida: dto.calleOAvenida,
          numeroPuerta: dto.numeroPuerta ?? null,
        },
        include: direccionInclude,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async update(
    id: number,
    dto: UpdateDireccionDto,
  ): Promise<DireccionConMunicipio> {
    if (dto.municipioId !== undefined) {
      await this.assertMunicipio(dto.municipioId);
    }
    const data: Prisma.DireccionUncheckedUpdateInput = {};
    if (dto.usuarioId !== undefined) data.usuarioId = dto.usuarioId;
    if (dto.municipioId !== undefined) data.municipioId = dto.municipioId;
    if (dto.zonaOComunidad !== undefined) {
      data.zonaOComunidad = dto.zonaOComunidad;
    }
    if (dto.calleOAvenida !== undefined) data.calleOAvenida = dto.calleOAvenida;
    if (dto.numeroPuerta !== undefined) data.numeroPuerta = dto.numeroPuerta;
    try {
      return await this.prisma.direccion.update({
        where: { id },
        data,
        include: direccionInclude,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: number): Promise<void> {
    try {
      await this.prisma.direccion.delete({ where: { id } });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  private async assertMunicipio(municipioId: number): Promise<void> {
    const municipio = await this.prisma.ubicacion.findFirst({
      where: { id: municipioId, tipo: "MUNICIPIO" },
      select: { id: true },
    });
    if (!municipio) {
      throw new BadRequestException(
        "La ubicación indicada no existe o no es un municipio.",
      );
    }
  }

  private async consultarOsrm(
    origen: { latitud: number; longitud: number },
    destino: { latitud: number; longitud: number },
    modo: CalcularRutaGpsDto["modo"],
  ): Promise<Omit<ResultadoRutaGps, "googleMapsUrl"> | null> {
    const url =
      `https://router.project-osrm.org/route/v1/${modo}/` +
      `${origen.longitud},${origen.latitud};${destino.longitud},${destino.latitud}` +
      "?overview=full&geometries=geojson&steps=true";

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) return null;

      const body: unknown = await response.json();
      if (!this.esRespuestaOsrm(body)) return null;

      const route = body.routes[0];
      return {
        distanciaMetros: route.distance,
        duracionSegundos: route.duration,
        geometriaGeoJson: route.geometry,
        pasosNavegacion: route.legs.flatMap((leg) =>
          leg.steps.map((step) => ({
            instrucciones: [step.maneuver.type, step.maneuver.modifier]
              .filter((parte): parte is string => Boolean(parte))
              .join(" "),
            nombreCalle: step.name,
            distanciaMetros: step.distance,
            duracionSegundos: step.duration,
          })),
        ),
      };
    } catch {
      return null;
    }
  }

  private esRespuestaOsrm(value: unknown): value is OsrmResponse {
    if (!value || typeof value !== "object") return false;
    const response = value as Partial<OsrmResponse>;
    const route = response.routes?.[0];
    return (
      response.code === "Ok" &&
      Array.isArray(response.routes) &&
      !!route &&
      typeof route.distance === "number" &&
      typeof route.duration === "number" &&
      route.geometry?.type === "LineString" &&
      Array.isArray(route.geometry.coordinates) &&
      Array.isArray(route.legs) &&
      route.legs.every((leg) => Array.isArray(leg.steps))
    );
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        throw new NotFoundException("No se encontró la dirección solicitada.");
      }
      if (error.code === "P2002" || error.code === "P2003") {
        throw new BadRequestException(
          "Uno de los identificadores relacionados no es válido.",
        );
      }
    }
    throw error;
  }
}
