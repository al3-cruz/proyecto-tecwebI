import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { seedUbicaciones } from './seeds/ubicaciones.seed';
import { seedRoles } from './seeds/roles.seed';
import { seedUsuarios } from './seeds/usuarios.seed';
import { seedTiposTramite } from './seeds/tipos-tramite.seed';
import { seedPlanes } from './seeds/planes.seed';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    'DATABASE_URL must be configured before running the Prisma seed.',
  );
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function seed(): Promise<void> {
  console.info('🌱 Iniciando Seed...');

  // 1. Ubicaciones y Planes (Catálogos base)
  const municipioSucreId = await seedUbicaciones(prisma);
  await seedPlanes(prisma);

  // 2. Seguridad
  await seedRoles(prisma);
  const adminId = await seedUsuarios(prisma);

  // 3. Trámites (usa el ID del municipio para la oficina)
  await seedTiposTramite(prisma, adminId, municipioSucreId);

  console.info(' Prisma seed completed successfully.');
}

seed()
  .catch((error: unknown) => {
    console.error('Prisma seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });