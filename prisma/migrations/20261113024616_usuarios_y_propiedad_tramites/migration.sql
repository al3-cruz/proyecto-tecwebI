-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- Backfill existing procedures before enforcing ownership.
INSERT INTO "Usuario" ("email", "passwordHash")
VALUES ('legacy-migration@invalid.local', '!DISABLED_LEGACY_ACCOUNT!');

ALTER TABLE "Tramite" ADD COLUMN "usuarioId" INTEGER;

UPDATE "Tramite"
SET "usuarioId" = (
  SELECT "id"
  FROM "Usuario"
  WHERE "email" = 'legacy-migration@invalid.local'
);

ALTER TABLE "Tramite" ALTER COLUMN "usuarioId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Tramite_usuarioId_id_idx" ON "Tramite"("usuarioId", "id");

-- AddForeignKey
ALTER TABLE "Tramite" ADD CONSTRAINT "Tramite_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
