-- CreateEnum
CREATE TYPE "ModalidadTramite" AS ENUM ('PRESENCIAL', 'VIRTUAL', 'MIXTA');

-- AlterTable
ALTER TABLE "RequisitoTramite" ADD COLUMN     "notaCondicional" TEXT;

-- AlterTable
ALTER TABLE "Tramite" ADD COLUMN     "codigoOficial" VARCHAR(20),
ADD COLUMN     "documentosEntregables" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "fechaActualizacionOficial" VARCHAR(80),
ADD COLUMN     "notaRequisitos" TEXT,
ADD COLUMN     "oficina" VARCHAR(160);

-- Preserve existing records while normalizing legacy modality labels.
ALTER TABLE "Tramite" DROP CONSTRAINT "Tramite_modalidad_check";

ALTER TABLE "Tramite"
ALTER COLUMN "modalidad" TYPE "ModalidadTramite"
USING (
  CASE "modalidad"
    WHEN 'Presencial' THEN 'PRESENCIAL'
    WHEN 'En línea' THEN 'VIRTUAL'
    WHEN 'Mixto' THEN 'MIXTA'
    ELSE upper("modalidad")
  END
)::"ModalidadTramite";
