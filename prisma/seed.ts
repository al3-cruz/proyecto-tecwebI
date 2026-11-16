import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { seedRoles } from './seeds/roles.seed';
import { seedTiposTramite } from './seeds/tipos-tramite.seed';
import { seedUsuarios } from './seeds/usuarios.seed';

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
  await seedRoles(prisma);
  const adminId = await seedUsuarios(prisma);
  await seedTiposTramite(prisma, adminId);
  console.info('Prisma seed completed successfully.');
}

seed()
  .catch((error: unknown) => {
    console.error('Prisma seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
