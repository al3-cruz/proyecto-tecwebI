-- Legacy fields are copied into the normalized tables before being removed.
-- CreateEnum
CREATE TYPE "TipoUbicacion" AS ENUM ('DEPARTAMENTO', 'PROVINCIA', 'MUNICIPIO');

-- CreateEnum
CREATE TYPE "TipoProfesional" AS ENUM ('ABOGADO_GESTOR', 'NOTARIO', 'ASESOR_JUNIOR');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('QR', 'PRESENCIAL');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO');

-- CreateTable
CREATE TABLE "Ubicacion" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "tipo" "TipoUbicacion" NOT NULL,
    "padreId" INTEGER,
    CONSTRAINT "Ubicacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Institucion" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(160) NOT NULL,
    CONSTRAINT "Institucion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Oficina" (
    "id" SERIAL NOT NULL,
    "codigoOficina" VARCHAR(40) NOT NULL,
    "nombre" VARCHAR(160) NOT NULL,
    "direccion" VARCHAR(250) NOT NULL,
    "telefono" VARCHAR(40),
    "latitud" DOUBLE PRECISION,
    "longitud" DOUBLE PRECISION,
    "municipioId" INTEGER NOT NULL,
    CONSTRAINT "Oficina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolPermiso" (
    "rolId" INTEGER NOT NULL,
    "permisoId" INTEGER NOT NULL,
    CONSTRAINT "RolPermiso_pkey" PRIMARY KEY ("rolId","permisoId")
);

-- CreateTable
CREATE TABLE "DocumentoEntregable" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(240) NOT NULL,
    "tramiteId" INTEGER NOT NULL,
    CONSTRAINT "DocumentoEntregable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MensajeTramite" (
    "id" SERIAL NOT NULL,
    "tramiteId" INTEGER NOT NULL,
    "autorId" INTEGER NOT NULL,
    "mensaje" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MensajeTramite_pkey" PRIMARY KEY ("id")
);

-- Preserve the existing address hierarchy and office records before changing
-- the legacy Direccion table.
INSERT INTO "Ubicacion" ("nombre", "tipo")
SELECT DISTINCT COALESCE(NULLIF(BTRIM(d."departamento"), ''), 'Sin especificar'),
       'DEPARTAMENTO'::"TipoUbicacion"
FROM "Direccion" d
WHERE NOT EXISTS (
    SELECT 1
    FROM "Ubicacion" u
    WHERE u."tipo" = 'DEPARTAMENTO'::"TipoUbicacion"
      AND u."padreId" IS NULL
      AND u."nombre" = COALESCE(NULLIF(BTRIM(d."departamento"), ''), 'Sin especificar')
);

INSERT INTO "Ubicacion" ("nombre", "tipo", "padreId")
SELECT DISTINCT COALESCE(NULLIF(BTRIM(d."provincia"), ''), 'Sin especificar'),
       'PROVINCIA'::"TipoUbicacion",
       departamento."id"
FROM "Direccion" d
JOIN "Ubicacion" departamento
  ON departamento."tipo" = 'DEPARTAMENTO'::"TipoUbicacion"
 AND departamento."padreId" IS NULL
 AND departamento."nombre" = COALESCE(NULLIF(BTRIM(d."departamento"), ''), 'Sin especificar')
WHERE NOT EXISTS (
    SELECT 1
    FROM "Ubicacion" u
    WHERE u."tipo" = 'PROVINCIA'::"TipoUbicacion"
      AND u."padreId" = departamento."id"
      AND u."nombre" = COALESCE(NULLIF(BTRIM(d."provincia"), ''), 'Sin especificar')
);

INSERT INTO "Ubicacion" ("nombre", "tipo", "padreId")
SELECT DISTINCT COALESCE(NULLIF(BTRIM(d."municipio"), ''), 'Sin especificar'),
       'MUNICIPIO'::"TipoUbicacion",
       provincia."id"
FROM "Direccion" d
JOIN "Ubicacion" departamento
  ON departamento."tipo" = 'DEPARTAMENTO'::"TipoUbicacion"
 AND departamento."padreId" IS NULL
 AND departamento."nombre" = COALESCE(NULLIF(BTRIM(d."departamento"), ''), 'Sin especificar')
JOIN "Ubicacion" provincia
  ON provincia."tipo" = 'PROVINCIA'::"TipoUbicacion"
 AND provincia."padreId" = departamento."id"
 AND provincia."nombre" = COALESCE(NULLIF(BTRIM(d."provincia"), ''), 'Sin especificar')
WHERE NOT EXISTS (
    SELECT 1
    FROM "Ubicacion" u
    WHERE u."tipo" = 'MUNICIPIO'::"TipoUbicacion"
      AND u."padreId" = provincia."id"
      AND u."nombre" = COALESCE(NULLIF(BTRIM(d."municipio"), ''), 'Sin especificar')
);

INSERT INTO "Ubicacion" ("nombre", "tipo")
SELECT 'Sin especificar', 'MUNICIPIO'::"TipoUbicacion"
WHERE NOT EXISTS (
    SELECT 1
    FROM "Ubicacion"
    WHERE "tipo" = 'MUNICIPIO'::"TipoUbicacion"
      AND "padreId" IS NULL
      AND "nombre" = 'Sin especificar'
);

INSERT INTO "Institucion" ("nombre")
SELECT DISTINCT COALESCE(
    NULLIF(BTRIM(t."institucionResponsable"), ''),
    'Institución no especificada'
)
FROM "Tramite" t
WHERE NOT EXISTS (
    SELECT 1
    FROM "Institucion" i
    WHERE i."nombre" = COALESCE(
        NULLIF(BTRIM(t."institucionResponsable"), ''),
        'Institución no especificada'
    )
);

INSERT INTO "Oficina" (
    "id", "codigoOficina", "nombre", "direccion", "telefono",
    "latitud", "longitud", "municipioId"
)
SELECT d."id",
       COALESCE(NULLIF(BTRIM(d."codigoOficina"), ''), 'LEGACY-DIR-' || d."id"::TEXT),
       LEFT(COALESCE(NULLIF(BTRIM(d."nombreOficina"), ''), 'Oficina heredada ' || d."id"::TEXT), 160),
       LEFT(COALESCE(
           NULLIF(CONCAT_WS(', ',
               NULLIF(BTRIM(d."calleOAvenida"), ''),
               NULLIF(BTRIM(d."numeroPuerta"), ''),
               NULLIF(BTRIM(d."zonaOComunidad"), '')
           ), ''),
           'Dirección no especificada'
       ), 250),
       NULL,
       d."latitud",
       d."longitud",
       municipio."id"
FROM "Direccion" d
JOIN "Ubicacion" departamento
  ON departamento."tipo" = 'DEPARTAMENTO'::"TipoUbicacion"
 AND departamento."padreId" IS NULL
 AND departamento."nombre" = COALESCE(NULLIF(BTRIM(d."departamento"), ''), 'Sin especificar')
JOIN "Ubicacion" provincia
  ON provincia."tipo" = 'PROVINCIA'::"TipoUbicacion"
 AND provincia."padreId" = departamento."id"
 AND provincia."nombre" = COALESCE(NULLIF(BTRIM(d."provincia"), ''), 'Sin especificar')
JOIN "Ubicacion" municipio
  ON municipio."tipo" = 'MUNICIPIO'::"TipoUbicacion"
 AND municipio."padreId" = provincia."id"
 AND municipio."nombre" = COALESCE(NULLIF(BTRIM(d."municipio"), ''), 'Sin especificar');

SELECT setval(
    pg_get_serial_sequence('"Oficina"', 'id'),
    COALESCE((SELECT MAX("id") FROM "Oficina"), 1),
    EXISTS (SELECT 1 FROM "Oficina")
);

INSERT INTO "Oficina" (
    "codigoOficina", "nombre", "direccion", "municipioId"
)
SELECT 'LEGACY-TRAM-' || t."id"::TEXT,
       LEFT(BTRIM(t."oficina"), 160),
       'Dirección no especificada',
       (SELECT u."id"
        FROM "Ubicacion" u
        WHERE u."tipo" = 'MUNICIPIO'::"TipoUbicacion"
        ORDER BY u."id"
        LIMIT 1)
FROM "Tramite" t
WHERE NULLIF(BTRIM(t."oficina"), '') IS NOT NULL;

INSERT INTO "DocumentoEntregable" ("nombre", "tramiteId")
SELECT BTRIM(documento), t."id"
FROM "Tramite" t
CROSS JOIN LATERAL UNNEST(t."documentosEntregables") AS documento
WHERE NULLIF(BTRIM(documento), '') IS NOT NULL;

INSERT INTO "MensajeTramite" ("tramiteId", "autorId", "mensaje", "createdAt")
SELECT t."id", t."usuarioId", t."observaciones", t."createdAt"
FROM "TramiteCompraventa" t
WHERE t."observaciones" IS NOT NULL;

INSERT INTO "RolPermiso" ("rolId", "permisoId")
SELECT rel."B", rel."A"
FROM "_RolPermisos" rel
ON CONFLICT DO NOTHING;

-- DropForeignKey
ALTER TABLE "Tramite" DROP CONSTRAINT IF EXISTS "Tramite_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "_RolPermisos" DROP CONSTRAINT IF EXISTS "_RolPermisos_A_fkey";

-- DropForeignKey
ALTER TABLE "_RolPermisos" DROP CONSTRAINT IF EXISTS "_RolPermisos_B_fkey";

-- DropForeignKey
ALTER TABLE "_TramiteOficinas" DROP CONSTRAINT IF EXISTS "_TramiteOficinas_A_fkey";

INSERT INTO "_TramiteOficinas" ("A", "B")
SELECT oficina."id", tramite."id"
FROM "Oficina" oficina
JOIN "Tramite" tramite
  ON oficina."codigoOficina" = 'LEGACY-TRAM-' || tramite."id"::TEXT
WHERE NULLIF(BTRIM(tramite."oficina"), '') IS NOT NULL
ON CONFLICT DO NOTHING;

-- DropIndex
DROP INDEX IF EXISTS "Direccion_codigoOficina_key";

-- DropIndex
DROP INDEX IF EXISTS "Tramite_modalidad_idx";

-- DropIndex
DROP INDEX IF EXISTS "Tramite_plazoEntregaDias_idx";

-- DropIndex
DROP INDEX IF EXISTS "Tramite_usuarioId_id_idx";

-- AlterTable
ALTER TABLE "Direccion" ADD COLUMN "municipioId" INTEGER;

UPDATE "Direccion" d
SET "municipioId" = municipio."id"
FROM "Ubicacion" departamento
JOIN "Ubicacion" provincia
  ON provincia."tipo" = 'PROVINCIA'::"TipoUbicacion"
 AND provincia."padreId" = departamento."id"
JOIN "Ubicacion" municipio
  ON municipio."tipo" = 'MUNICIPIO'::"TipoUbicacion"
 AND municipio."padreId" = provincia."id"
WHERE departamento."tipo" = 'DEPARTAMENTO'::"TipoUbicacion"
  AND departamento."padreId" IS NULL
  AND departamento."nombre" = COALESCE(NULLIF(BTRIM(d."departamento"), ''), 'Sin especificar')
  AND provincia."nombre" = COALESCE(NULLIF(BTRIM(d."provincia"), ''), 'Sin especificar')
  AND municipio."nombre" = COALESCE(NULLIF(BTRIM(d."municipio"), ''), 'Sin especificar');

UPDATE "Direccion"
SET "municipioId" = (
    SELECT "id"
    FROM "Ubicacion"
    WHERE "tipo" = 'MUNICIPIO'::"TipoUbicacion"
      AND "padreId" IS NULL
      AND "nombre" = 'Sin especificar'
    ORDER BY "id"
    LIMIT 1
)
WHERE "municipioId" IS NULL;

ALTER TABLE "Direccion"
    ALTER COLUMN "municipioId" SET NOT NULL,
    DROP COLUMN "codigoOficina",
    DROP COLUMN "departamento",
    DROP COLUMN "latitud",
    DROP COLUMN "longitud",
    DROP COLUMN "municipio",
    DROP COLUMN "nombreOficina",
    DROP COLUMN "provincia";

-- AlterTable
ALTER TABLE "PasoProcedimiento" ADD COLUMN     "esGratuito" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "RequisitoCompraventa" ADD COLUMN     "archivoUrl" VARCHAR(500);

-- AlterTable
ALTER TABLE "RequisitoTramite" ADD COLUMN     "archivoUrl" VARCHAR(500);

-- AlterTable
ALTER TABLE "Tramite" DROP COLUMN "documentosEntregables",
ADD COLUMN     "audioQuechuaUrl" VARCHAR(500),
ADD COLUMN     "clienteId" INTEGER,
ADD COLUMN     "institucionId" INTEGER,
ADD COLUMN     "tramitadorId" INTEGER,
ADD COLUMN     "fechaActualizacionOficialNueva" TIMESTAMP(3),
ADD COLUMN     "videoLsbUrl" VARCHAR(500);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "Tramite"
        WHERE NULLIF(BTRIM("fechaActualizacionOficial"), '') IS NOT NULL
          AND (
              LEFT(BTRIM("fechaActualizacionOficial"), 10) !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
              OR NOT pg_input_is_valid(
                  LEFT(BTRIM("fechaActualizacionOficial"), 10),
                  'date'
              )
          )
          AND BTRIM("fechaActualizacionOficial") !~* '^[0-9]{1,2} de (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre) de [0-9]{4}$'
    ) THEN
        RAISE EXCEPTION
            'Tramite.fechaActualizacionOficial contains an unsupported date; convert it to ISO (YYYY-MM-DD) before applying this migration.';
    END IF;
END $$;

UPDATE "Tramite" t
SET "institucionId" = institucion."id",
    "tramitadorId" = t."usuarioId",
    "clienteId" = t."usuarioId",
    "fechaActualizacionOficialNueva" = CASE
        WHEN BTRIM(t."fechaActualizacionOficial") ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
        THEN LEFT(BTRIM(t."fechaActualizacionOficial"), 10)::DATE::TIMESTAMP(3)
        WHEN BTRIM(t."fechaActualizacionOficial") ~* '^[0-9]{1,2} de (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre) de [0-9]{4}$'
        THEN make_date(
            (regexp_match(BTRIM(t."fechaActualizacionOficial"), '([0-9]{4})$'))[1]::INTEGER,
            CASE lower((regexp_match(BTRIM(t."fechaActualizacionOficial"), ' de ([^ ]+) de '))[1])
                WHEN 'enero' THEN 1
                WHEN 'febrero' THEN 2
                WHEN 'marzo' THEN 3
                WHEN 'abril' THEN 4
                WHEN 'mayo' THEN 5
                WHEN 'junio' THEN 6
                WHEN 'julio' THEN 7
                WHEN 'agosto' THEN 8
                WHEN 'septiembre' THEN 9
                WHEN 'setiembre' THEN 9
                WHEN 'octubre' THEN 10
                WHEN 'noviembre' THEN 11
                WHEN 'diciembre' THEN 12
            END,
            (regexp_match(BTRIM(t."fechaActualizacionOficial"), '^([0-9]{1,2}) de '))[1]::INTEGER
        )::TIMESTAMP(3)
        ELSE NULL
    END
FROM "Institucion" institucion
WHERE institucion."nombre" = COALESCE(
    NULLIF(BTRIM(t."institucionResponsable"), ''),
    'Institución no especificada'
);

ALTER TABLE "Tramite"
    ALTER COLUMN "institucionId" SET NOT NULL,
    ALTER COLUMN "tramitadorId" SET NOT NULL,
    DROP COLUMN "institucionResponsable",
    DROP COLUMN "oficina",
    DROP COLUMN "usuarioId",
    DROP COLUMN "fechaActualizacionOficial";

ALTER TABLE "Tramite"
    RENAME COLUMN "fechaActualizacionOficialNueva" TO "fechaActualizacionOficial";

-- AlterTable
ALTER TABLE "TramiteCompraventa" DROP COLUMN "observaciones";

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "telefono" VARCHAR(40),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Usuario" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- DropTable
DROP TABLE IF EXISTS "_RolPermisos";

-- CreateTable
CREATE TABLE "Plan" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "precio" DECIMAL(10,2) NOT NULL,
    "esParaProfesional" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerfilProfesional" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "tipo" "TipoProfesional" NOT NULL,
    "matricula" VARCHAR(100) NOT NULL,
    "especialidad" VARCHAR(200),
    "tarifaReferencial" DECIMAL(10,2),
    "verificado" BOOLEAN NOT NULL DEFAULT false,
    "destacado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerfilProfesional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Suscripcion" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "planId" INTEGER NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Suscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pago" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "metodo" "MetodoPago" NOT NULL,
    "estado" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "comprobanteUrl" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pago_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Ubicacion_padreId_idx" ON "Ubicacion"("padreId");

-- CreateIndex
CREATE UNIQUE INDEX "Institucion_nombre_key" ON "Institucion"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Oficina_codigoOficina_key" ON "Oficina"("codigoOficina");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_nombre_key" ON "Plan"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "PerfilProfesional_usuarioId_key" ON "PerfilProfesional"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Suscripcion_usuarioId_key" ON "Suscripcion"("usuarioId");

-- CreateIndex
CREATE INDEX "Suscripcion_deletedAt_idx" ON "Suscripcion"("deletedAt");

-- CreateIndex
CREATE INDEX "DocumentoEntregable_tramiteId_idx" ON "DocumentoEntregable"("tramiteId");

-- CreateIndex
CREATE INDEX "MensajeTramite_tramiteId_idx" ON "MensajeTramite"("tramiteId");

-- CreateIndex
CREATE UNIQUE INDEX "Tramite_codigoOficial_key" ON "Tramite"("codigoOficial");

-- CreateIndex
CREATE INDEX "Tramite_clienteId_idx" ON "Tramite"("clienteId");

-- CreateIndex
CREATE INDEX "Tramite_tramitadorId_id_idx" ON "Tramite"("tramitadorId", "id");

-- AddForeignKey
ALTER TABLE "Ubicacion" ADD CONSTRAINT "Ubicacion_padreId_fkey" FOREIGN KEY ("padreId") REFERENCES "Ubicacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Oficina" ADD CONSTRAINT "Oficina_municipioId_fkey" FOREIGN KEY ("municipioId") REFERENCES "Ubicacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolPermiso" ADD CONSTRAINT "RolPermiso_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "Rol"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolPermiso" ADD CONSTRAINT "RolPermiso_permisoId_fkey" FOREIGN KEY ("permisoId") REFERENCES "Permiso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerfilProfesional" ADD CONSTRAINT "PerfilProfesional_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Suscripcion" ADD CONSTRAINT "Suscripcion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Suscripcion" ADD CONSTRAINT "Suscripcion_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tramite" ADD CONSTRAINT "Tramite_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tramite" ADD CONSTRAINT "Tramite_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tramite" ADD CONSTRAINT "Tramite_tramitadorId_fkey" FOREIGN KEY ("tramitadorId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoEntregable" ADD CONSTRAINT "DocumentoEntregable_tramiteId_fkey" FOREIGN KEY ("tramiteId") REFERENCES "Tramite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MensajeTramite" ADD CONSTRAINT "MensajeTramite_tramiteId_fkey" FOREIGN KEY ("tramiteId") REFERENCES "TramiteCompraventa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MensajeTramite" ADD CONSTRAINT "MensajeTramite_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Direccion" ADD CONSTRAINT "Direccion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Direccion" ADD CONSTRAINT "Direccion_municipioId_fkey" FOREIGN KEY ("municipioId") REFERENCES "Ubicacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TramiteOficinas" ADD CONSTRAINT "_TramiteOficinas_A_fkey" FOREIGN KEY ("A") REFERENCES "Oficina"("id") ON DELETE CASCADE ON UPDATE CASCADE;
