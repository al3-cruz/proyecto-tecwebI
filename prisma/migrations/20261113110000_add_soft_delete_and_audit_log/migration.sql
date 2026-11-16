ALTER TABLE "Tramite"
    ADD COLUMN "deletedAt" TIMESTAMP(3);

ALTER TABLE "Usuario"
    ADD COLUMN "deletedAt" TIMESTAMP(3);

ALTER TABLE "TramiteCompraventa"
    ADD COLUMN "deletedAt" TIMESTAMP(3);

ALTER TABLE "Direccion"
    ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "entity" VARCHAR(120) NOT NULL,
    "entityId" VARCHAR(120) NOT NULL,
    "action" VARCHAR(20) NOT NULL,
    "userId" INTEGER,
    "oldData" JSONB,
    "newData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Tramite_deletedAt_idx" ON "Tramite"("deletedAt");
CREATE INDEX "Usuario_deletedAt_idx" ON "Usuario"("deletedAt");
CREATE INDEX "TramiteCompraventa_deletedAt_idx"
    ON "TramiteCompraventa"("deletedAt");
CREATE INDEX "Direccion_deletedAt_idx" ON "Direccion"("deletedAt");
CREATE INDEX "AuditLog_entity_entityId_createdAt_idx"
    ON "AuditLog"("entity", "entityId", "createdAt");
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

ALTER TABLE "AuditLog"
    ADD CONSTRAINT "AuditLog_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "Usuario"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
