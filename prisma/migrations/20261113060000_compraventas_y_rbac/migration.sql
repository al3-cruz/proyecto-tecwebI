CREATE TYPE "EstadoTramite" AS ENUM (
    'VENTANILLA_INFORMACIONES',
    'INSCRIPCION_RAPIDA',
    'PRE_IMPRESION_REVISION',
    'EN_PROCESO_REGISTRO',
    'LISTO_PARA_DEVOLUCION',
    'ENTREGADO',
    'OBSERVADO'
);

CREATE TYPE "TipoRequisitoCompraventa" AS ENUM (
    'TITULO_TRANSFERENCIA',
    'IMPUESTO_ANUAL_IMPBI',
    'IMPUESTO_TRANSFERENCIA',
    'PLANO_Y_CERTIFICADO_CATASTRAL',
    'CEDULA_IDENTIDAD_O_NIT',
    'PODER_NOTARIADO'
);

CREATE TABLE "Rol" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(80) NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Rol_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Permiso" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(120) NOT NULL,
    "descripcion" VARCHAR(240) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Permiso_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SecuenciaTramiteCompraventa" (
    "anio" INTEGER NOT NULL,
    "ultimo" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SecuenciaTramiteCompraventa_pkey" PRIMARY KEY ("anio")
);

CREATE TABLE "TramiteCompraventa" (
    "id" SERIAL NOT NULL,
    "codigoTramite" VARCHAR(32) NOT NULL,
    "folioReal" VARCHAR(100) NOT NULL,
    "fechaIngreso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaEstimadaEntrega" TIMESTAMP(3) NOT NULL,
    "fechaEntregaReal" TIMESTAMP(3),
    "vendedorNombre" VARCHAR(200) NOT NULL,
    "vendedorDocumento" VARCHAR(40) NOT NULL,
    "compradorNombre" VARCHAR(200) NOT NULL,
    "compradorDocumento" VARCHAR(40) NOT NULL,
    "esBienGanancial" BOOLEAN NOT NULL DEFAULT false,
    "conApoderado" BOOLEAN NOT NULL DEFAULT false,
    "apoderadoNombre" VARCHAR(200),
    "apoderadoDocumento" VARCHAR(40),
    "numeroPoderNotarial" VARCHAR(100),
    "montoArancel" DECIMAL(12,2) NOT NULL,
    "arancelPagado" BOOLEAN NOT NULL DEFAULT false,
    "preImpresionConfirmada" BOOLEAN NOT NULL DEFAULT false,
    "observaciones" TEXT,
    "estado" "EstadoTramite" NOT NULL DEFAULT 'VENTANILLA_INFORMACIONES',
    "estadoAnterior" "EstadoTramite",
    "usuarioId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TramiteCompraventa_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RequisitoCompraventa" (
    "id" SERIAL NOT NULL,
    "tipoRequisito" "TipoRequisitoCompraventa" NOT NULL,
    "presentoOriginal" BOOLEAN NOT NULL DEFAULT false,
    "cantidadFotocopias" INTEGER NOT NULL DEFAULT 0,
    "verificado" BOOLEAN NOT NULL DEFAULT false,
    "tramiteId" INTEGER NOT NULL,
    CONSTRAINT "RequisitoCompraventa_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "_UsuarioRoles" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_UsuarioRoles_AB_pkey" PRIMARY KEY ("A", "B")
);

CREATE TABLE "_RolPermisos" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_RolPermisos_AB_pkey" PRIMARY KEY ("A", "B")
);

CREATE UNIQUE INDEX "Rol_codigo_key" ON "Rol"("codigo");
CREATE UNIQUE INDEX "Permiso_codigo_key" ON "Permiso"("codigo");
CREATE UNIQUE INDEX "TramiteCompraventa_codigoTramite_key"
    ON "TramiteCompraventa"("codigoTramite");
CREATE INDEX "TramiteCompraventa_usuarioId_estado_idx"
    ON "TramiteCompraventa"("usuarioId", "estado");
CREATE INDEX "TramiteCompraventa_fechaIngreso_idx"
    ON "TramiteCompraventa"("fechaIngreso");
CREATE UNIQUE INDEX "RequisitoCompraventa_tramiteId_tipoRequisito_key"
    ON "RequisitoCompraventa"("tramiteId", "tipoRequisito");
CREATE INDEX "RequisitoCompraventa_tramiteId_verificado_idx"
    ON "RequisitoCompraventa"("tramiteId", "verificado");
CREATE INDEX "_UsuarioRoles_B_index" ON "_UsuarioRoles"("B");
CREATE INDEX "_RolPermisos_B_index" ON "_RolPermisos"("B");

ALTER TABLE "TramiteCompraventa"
    ADD CONSTRAINT "TramiteCompraventa_usuarioId_fkey"
    FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RequisitoCompraventa"
    ADD CONSTRAINT "RequisitoCompraventa_tramiteId_fkey"
    FOREIGN KEY ("tramiteId") REFERENCES "TramiteCompraventa"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_UsuarioRoles"
    ADD CONSTRAINT "_UsuarioRoles_A_fkey"
    FOREIGN KEY ("A") REFERENCES "Rol"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_UsuarioRoles"
    ADD CONSTRAINT "_UsuarioRoles_B_fkey"
    FOREIGN KEY ("B") REFERENCES "Usuario"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_RolPermisos"
    ADD CONSTRAINT "_RolPermisos_A_fkey"
    FOREIGN KEY ("A") REFERENCES "Permiso"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_RolPermisos"
    ADD CONSTRAINT "_RolPermisos_B_fkey"
    FOREIGN KEY ("B") REFERENCES "Rol"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
