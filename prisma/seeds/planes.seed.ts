import type { PrismaClient } from "../../src/generated/prisma/client";
import { Prisma } from "../../src/generated/prisma/client";

export async function seedPlanes(prisma: PrismaClient): Promise<void> {
  await prisma.plan.upsert({
    where: { nombre: "Pase Único Ciudadano" },
    update: {
      precio: new Prisma.Decimal(50),
      esParaProfesional: false,
    },
    create: {
      nombre: "Pase Único Ciudadano",
      precio: new Prisma.Decimal(50),
      esParaProfesional: false,
    },
  });

  await prisma.plan.upsert({
    where: { nombre: "Plan Pro Profesional" },
    update: {
      precio: new Prisma.Decimal(150),
      esParaProfesional: true,
    },
    create: {
      nombre: "Plan Pro Profesional",
      precio: new Prisma.Decimal(150),
      esParaProfesional: true,
    },
  });

  console.info("Seeded 2 planes.");
}
