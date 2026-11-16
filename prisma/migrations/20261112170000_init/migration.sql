-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

CREATE TABLE "Tramite" (
    "id" SERIAL NOT NULL,
    "codigo" INTEGER NOT NULL,
    "titulo" VARCHAR(240) NOT NULL,
    "institucionResponsable" VARCHAR(160) NOT NULL DEFAULT 'Registro Público de Derechos Reales',
    "finalidad" TEXT NOT NULL,
    "plazoEntregaDias" INTEGER NOT NULL,
    "modalidad" VARCHAR(20) NOT NULL,
    "baseLegal" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tramite_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Tramite_codigo_range_check" CHECK ("codigo" BETWEEN 1 AND 53),
    CONSTRAINT "Tramite_modalidad_check" CHECK ("modalidad" IN ('Presencial', 'En línea', 'Mixto')),
    CONSTRAINT "Tramite_plazoEntregaDias_check" CHECK ("plazoEntregaDias" > 0)
);

CREATE TABLE "RequisitoTramite" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(240) NOT NULL,
    "detalle" TEXT NOT NULL,
    "obligatorio" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL,
    "tramiteId" INTEGER NOT NULL,

    CONSTRAINT "RequisitoTramite_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PasoProcedimiento" (
    "id" SERIAL NOT NULL,
    "orden" INTEGER NOT NULL,
    "titulo" VARCHAR(240) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "plazoDias" INTEGER,
    "tramiteId" INTEGER NOT NULL,

    CONSTRAINT "PasoProcedimiento_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Direccion" (
    "id" SERIAL NOT NULL,
    "codigoOficina" VARCHAR(40),
    "nombreOficina" VARCHAR(160),
    "usuarioId" INTEGER,
    "departamento" VARCHAR(100) NOT NULL,
    "provincia" VARCHAR(100) NOT NULL,
    "municipio" VARCHAR(100) NOT NULL,
    "zonaOComunidad" VARCHAR(160) NOT NULL,
    "calleOAvenida" VARCHAR(200) NOT NULL,
    "numeroPuerta" VARCHAR(40),
    "fechaRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Direccion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "_TramiteOficinas" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_TramiteOficinas_AB_pkey" PRIMARY KEY ("A", "B")
);

CREATE UNIQUE INDEX "Tramite_codigo_key" ON "Tramite"("codigo");
CREATE INDEX "Tramite_codigo_idx" ON "Tramite"("codigo");
CREATE INDEX "Tramite_modalidad_idx" ON "Tramite"("modalidad");
CREATE INDEX "RequisitoTramite_tramiteId_idx" ON "RequisitoTramite"("tramiteId");
CREATE INDEX "PasoProcedimiento_tramiteId_idx" ON "PasoProcedimiento"("tramiteId");
CREATE UNIQUE INDEX "Direccion_codigoOficina_key" ON "Direccion"("codigoOficina");
CREATE INDEX "Direccion_usuarioId_idx" ON "Direccion"("usuarioId");
CREATE INDEX "_TramiteOficinas_B_index" ON "_TramiteOficinas"("B");

ALTER TABLE "RequisitoTramite"
    ADD CONSTRAINT "RequisitoTramite_tramiteId_fkey"
    FOREIGN KEY ("tramiteId") REFERENCES "Tramite"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PasoProcedimiento"
    ADD CONSTRAINT "PasoProcedimiento_tramiteId_fkey"
    FOREIGN KEY ("tramiteId") REFERENCES "Tramite"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_TramiteOficinas"
    ADD CONSTRAINT "_TramiteOficinas_A_fkey"
    FOREIGN KEY ("A") REFERENCES "Direccion"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_TramiteOficinas"
    ADD CONSTRAINT "_TramiteOficinas_B_fkey"
    FOREIGN KEY ("B") REFERENCES "Tramite"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
