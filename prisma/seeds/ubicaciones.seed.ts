import type {
  PrismaClient,
  TipoUbicacion,
} from "../../src/generated/prisma/client";

async function obtenerOCrearUbicacion(
  prisma: PrismaClient,
  datos: { nombre: string; tipo: TipoUbicacion; padreId: number | null },
): Promise<{ id: number }> {
  const existente = await prisma.ubicacion.findFirst({
    where: datos,
    select: { id: true },
  });
  if (existente) {
    return existente;
  }

  return prisma.ubicacion.create({
    data: datos,
    select: { id: true },
  });
}

export async function seedUbicaciones(prisma: PrismaClient): Promise<number> {
  const chuquisaca = await obtenerOCrearUbicacion(prisma, {
    nombre: "Chuquisaca",
    tipo: "DEPARTAMENTO",
    padreId: null,
  });
  const oropeza = await obtenerOCrearUbicacion(prisma, {
    nombre: "Oropeza",
    tipo: "PROVINCIA",
    padreId: chuquisaca.id,
  });
  const sucre = await obtenerOCrearUbicacion(prisma, {
    nombre: "Sucre",
    tipo: "MUNICIPIO",
    padreId: oropeza.id,
  });

  console.info(`Seeded 3 ubicaciones (Sucre ID: ${sucre.id}).`);
  return sucre.id;
}
