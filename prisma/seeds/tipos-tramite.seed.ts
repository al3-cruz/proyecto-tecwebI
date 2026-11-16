import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Prisma, PrismaClient } from '../../src/generated/prisma/client';

interface OficinaSeed {
  codigoOficina: string;
  nombreOficina: string;
  departamento: string;
  provincia: string;
  municipio: string;
  zonaOComunidad: string;
  calleOAvenida: string;
  numeroPuerta?: string;
  latitud?: number;
  longitud?: number;
}

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
  oficina?: string | null;
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

const OFICINAS_BASE: OficinaSeed[] = [
  {
    codigoOficina: 'CHQ-SUCRE-CENTRAL',
    nombreOficina: 'Oficina Central de Sucre',
    departamento: 'Chuquisaca',
    provincia: 'Oropeza',
    municipio: 'Sucre',
    zonaOComunidad: 'Centro (Atención: Lunes a Viernes 08:00 - 16:00)',
    calleOAvenida: 'Av. Venezuela esq. Ladislao Cabrera (edificio TDJ)',
    numeroPuerta: 'S/N',
    latitud: -19.04295,
    longitud: -65.25548,
  },
];

const LEGACY_OFFICE_CODES = [
  'LPZ-CENTRAL',
  'CBB-CENTRAL',
  'SCZ-CENTRAL',
  'CHQ-SUCRE-MODULO',
] as const;

function mapModalidad(modalidad: string): 'PRESENCIAL' | 'VIRTUAL' | 'MIXTA' {
  switch (modalidad) {
    case 'Presencial':
    case 'PRESENCIAL':
      return 'PRESENCIAL';
    case 'En línea':
    case 'VIRTUAL':
      return 'VIRTUAL';
    case 'Mixto':
    case 'MIXTA':
      return 'MIXTA';
    default:
      throw new Error(`Unsupported procedure modality in seed: ${modalidad}`);
  }
}

async function loadTiposTramite(): Promise<TramiteSeed[]> {
  const jsonPath = join(process.cwd(), 'prisma', 'data', 'tramites.json');
  const tramites = JSON.parse(
    await readFile(jsonPath, 'utf8'),
  ) as TramiteSeed[];
  if (
    tramites.length !== 1 ||
    tramites[0].codigoOficial !== '1' ||
    tramites[0].oficinas.length !== 1 ||
    tramites[0].oficinas[0] !== 'CHQ-SUCRE-CENTRAL'
  ) {
    throw new Error(
      'The Sucre seed must contain exactly the official procedure 1 and the CHQ-SUCRE-CENTRAL office.',
    );
  }
  return tramites;
}

export async function seedTiposTramite(
  prisma: PrismaClient,
  usuarioId: number,
): Promise<void> {
  const tramites = await loadTiposTramite();

  await prisma.direccion.deleteMany({
    where: { codigoOficina: { in: [...LEGACY_OFFICE_CODES] } },
  });

  for (const oficina of OFICINAS_BASE) {
    const { codigoOficina, ...datosOficina } = oficina;
    await prisma.direccion.upsert({
      where: { codigoOficina },
      create: { codigoOficina, ...datosOficina },
      update: datosOficina,
    });
  }

  for (const tramite of tramites) {
    const { requisitos, pasos, oficinas, modalidad, ...datosTramite } = tramite;
    const datosFicha: Prisma.TramiteUncheckedCreateInput = {
      ...datosTramite,
      usuarioId,
      deletedAt: null,
      codigoOficial: tramite.codigoOficial ?? null,
      oficina: tramite.oficina ?? null,
      modalidad: mapModalidad(modalidad),
      notaRequisitos: tramite.notaRequisitos ?? null,
      documentosEntregables: tramite.documentosEntregables ?? [],
      fechaActualizacionOficial: tramite.fechaActualizacionOficial ?? null,
    };
    const relacionesOficina = oficinas.map((codigoOficina) => ({
      codigoOficina,
    }));

    await prisma.tramite.upsert({
      where: { codigo: tramite.codigo },
      create: {
        ...datosFicha,
        requisitos: { create: requisitos },
        pasos: { create: pasos },
        oficinas: { connect: relacionesOficina },
      },
      update: {
        ...datosFicha,
        deletedAt: null,
        requisitos: { deleteMany: {}, create: requisitos },
        pasos: { deleteMany: {}, create: pasos },
        oficinas: { set: relacionesOficina },
      },
    });
  }

  console.info(
    `Seeded ${OFICINAS_BASE.length} offices and ${tramites.length} procedure types.`,
  );
}
