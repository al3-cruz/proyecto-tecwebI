import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  ModalidadTramite,
  type PrismaClient,
} from "../../src/generated/prisma/client";

interface RequisitoSeed {
  nombre: string;
  detalle: string;
  obligatorio: boolean;
  orden: number;
  notaCondicional?: string | null;
}

interface PasoSeed {
  orden: number;
  titulo: string;
  descripcion: string;
  plazoDias: number | null;
}

interface TramiteSeed {
  codigo: number;
  codigoOficial?: string | null;
  titulo: string;
  institucionResponsable: string;
  finalidad: string;
  plazoEntregaDias: number;
  modalidad: string;
  notaRequisitos?: string | null;
  documentosEntregables?: string[];
  baseLegal: string | null;
  fechaActualizacionOficial?: string | null;
  requisitos: RequisitoSeed[];
  pasos: PasoSeed[];
  oficinas: string[];
}

const OFICINAS_SEED: Record<
  string,
  { nombre: string; direccion: string; telefono: string }
> = {
  "CHQ-SUCRE-CENTRAL": {
    nombre: "Oficina Central de Sucre",
    direccion: "Av. Venezuela esq. Ladislao Cabrera (edificio TDJ)",
    telefono: "+591 4 1234567",
  },
};

function mapModalidad(modalidad: string): ModalidadTramite {
  switch (modalidad) {
    case "Presencial":
    case "PRESENCIAL":
      return ModalidadTramite.PRESENCIAL;
    case "En línea":
    case "VIRTUAL":
      return ModalidadTramite.VIRTUAL;
    case "Mixto":
    case "MIXTA":
      return ModalidadTramite.MIXTA;
    default:
      throw new Error(`Unsupported procedure modality in seed: ${modalidad}`);
  }
}

function parseFechaActualizacion(value?: string | null): Date | null {
  if (!value) {
    return null;
  }
  const fecha = new Date(value);
  if (Number.isNaN(fecha.getTime())) {
    throw new Error(`Invalid official update date in seed: ${value}`);
  }
  return fecha;
}

export async function seedTiposTramite(
  prisma: PrismaClient,
  usuarioId: number,
  municipioSucreId: number,
): Promise<void> {
  const jsonPath = join(process.cwd(), "prisma", "data", "tramites.json");
  const tramites = JSON.parse(
    await readFile(jsonPath, "utf8"),
  ) as TramiteSeed[];

  for (const tramite of tramites) {
    const institucion = await prisma.institucion.upsert({
      where: { nombre: tramite.institucionResponsable },
      update: {},
      create: { nombre: tramite.institucionResponsable },
    });

    const oficinaIds = await Promise.all(
      tramite.oficinas.map(async (codigoOficina) => {
        const datosOficina = OFICINAS_SEED[codigoOficina];
        if (!datosOficina) {
          throw new Error(`Unknown office code in seed: ${codigoOficina}`);
        }

        const oficina = await prisma.oficina.upsert({
          where: { codigoOficina },
          update: { ...datosOficina, municipioId: municipioSucreId },
          create: {
            codigoOficina,
            ...datosOficina,
            municipioId: municipioSucreId,
          },
          select: { id: true },
        });
        return { id: oficina.id };
      }),
    );

    const datosTramite = {
      codigoOficial: tramite.codigoOficial ?? null,
      titulo: tramite.titulo,
      finalidad: tramite.finalidad,
      plazoEntregaDias: tramite.plazoEntregaDias,
      modalidad: mapModalidad(tramite.modalidad),
      notaRequisitos: tramite.notaRequisitos ?? null,
      baseLegal: tramite.baseLegal,
      fechaActualizacionOficial: parseFechaActualizacion(
        tramite.fechaActualizacionOficial,
      ),
      institucion: { connect: { id: institucion.id } },
      tramitador: { connect: { id: usuarioId } },
    };
    const requisitos = tramite.requisitos.map((requisito) => ({
      nombre: requisito.nombre,
      detalle: requisito.detalle,
      obligatorio: requisito.obligatorio,
      orden: requisito.orden,
      notaCondicional: requisito.notaCondicional ?? null,
    }));
    const pasos = tramite.pasos.map((paso) => ({
      orden: paso.orden,
      titulo: paso.titulo,
      descripcion: paso.descripcion,
      plazoDias: paso.plazoDias,
    }));
    const documentosEntregables = (tramite.documentosEntregables ?? []).map(
      (nombre) => ({ nombre }),
    );

    await prisma.tramite.upsert({
      where: { codigo: tramite.codigo },
      create: {
        ...datosTramite,
        codigo: tramite.codigo,
        requisitos: { create: requisitos },
        pasos: { create: pasos },
        documentosEntregables: { create: documentosEntregables },
        oficinas: { connect: oficinaIds },
      },
      update: {
        ...datosTramite,
        requisitos: { deleteMany: {}, create: requisitos },
        pasos: { deleteMany: {}, create: pasos },
        documentosEntregables: {
          deleteMany: {},
          create: documentosEntregables,
        },
        oficinas: { set: oficinaIds },
      },
    });
  }

  console.info(`Seeded ${tramites.length} procedure types.`);
}
