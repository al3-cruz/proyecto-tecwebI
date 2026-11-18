import { PasswordService } from "../../src/auth/password.service";
import type { PrismaClient } from "../../src/generated/prisma/client";

export async function seedUsuarios(prisma: PrismaClient): Promise<number> {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password?.trim()) {
    throw new Error(
      "SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD deben estar configurados en el archivo .env antes de ejecutar el seed.",
    );
  }
  if (password.length < 8 || password.length > 72) {
    throw new Error("SEED_ADMIN_PASSWORD debe tener entre 8 y 72 caracteres.");
  }

  const passwordService = new PasswordService();
  const passwordHash = await passwordService.hashPassword(password);

  const admin = await prisma.usuario.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      deletedAt: null,
      roles: { connect: { codigo: "ADMIN" } },
    },
    update: {
      passwordHash,
      deletedAt: null,
      roles: { connect: { codigo: "ADMIN" } },
    },
    select: { id: true },
  });

  return admin.id;
}
