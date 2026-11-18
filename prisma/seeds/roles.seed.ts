import type { PrismaClient } from "../../src/generated/prisma/client";

const PERMISOS_BASE = [
  { codigo: "tramites:crear", descripcion: "Crear fichas del catálogo." },
  { codigo: "tramites:leer", descripcion: "Consultar el catálogo." },
  {
    codigo: "tramites:actualizar",
    descripcion: "Actualizar fichas del catálogo.",
  },
  {
    codigo: "tramites:eliminar",
    descripcion: "Eliminar fichas del catálogo.",
  },
  {
    codigo: "compraventas:crear",
    descripcion: "Iniciar trámites de compraventa propios.",
  },
  {
    codigo: "compraventas:leer",
    descripcion: "Consultar trámites de compraventa propios.",
  },
  {
    codigo: "compraventas:leer_todos",
    descripcion: "Consultar todos los trámites de compraventa.",
  },
  {
    codigo: "compraventas:actualizar",
    descripcion: "Actualizar trámites de compraventa propios.",
  },
  {
    codigo: "compraventas:avanzar_etapa",
    descripcion: "Avanzar etapas de trámites de compraventa propios.",
  },
  {
    codigo: "compraventas:eliminar",
    descripcion: "Eliminar trámites de compraventa.",
  },
  { codigo: "usuarios:leer", descripcion: "Consultar usuarios." },
  { codigo: "roles:actualizar", descripcion: "Actualizar permisos de roles." },
] as const;

const permisosAdmin = PERMISOS_BASE.map(({ codigo }) => ({ codigo }));
const permisosCiudadano = [
  { codigo: "tramites:leer" },
  { codigo: "compraventas:crear" },
  { codigo: "compraventas:leer" },
  { codigo: "compraventas:actualizar" },
  { codigo: "compraventas:avanzar_etapa" },
];

export async function seedRoles(prisma: PrismaClient): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const permiso of PERMISOS_BASE) {
      await tx.permiso.upsert({
        where: { codigo: permiso.codigo },
        create: permiso,
        update: { descripcion: permiso.descripcion },
      });
    }

    const permisos = await tx.permiso.findMany({
      where: { codigo: { in: PERMISOS_BASE.map(({ codigo }) => codigo) } },
      select: { id: true, codigo: true },
    });
    if (permisos.length !== PERMISOS_BASE.length) {
      throw new Error("Failed to create all permissions required by the seed.");
    }
    const permisoIdByCodigo = new Map(
      permisos.map(({ id, codigo }) => [codigo, id]),
    );

    const roles = [
      { codigo: "ADMIN", nombre: "Administrador", permisos: permisosAdmin },
      {
        codigo: "CIUDADANO",
        nombre: "Ciudadano",
        permisos: permisosCiudadano,
      },
      {
        codigo: "PROFESIONAL",
        nombre: "Profesional Aliado",
        permisos: permisosCiudadano,
      },
    ] as const;

    for (const rol of roles) {
      const rolCreado = await tx.rol.upsert({
        where: { codigo: rol.codigo },
        create: { codigo: rol.codigo, nombre: rol.nombre },
        update: { nombre: rol.nombre },
        select: { id: true },
      });

      await tx.rolPermiso.deleteMany({ where: { rolId: rolCreado.id } });
      await tx.rolPermiso.createMany({
        data: rol.permisos.map(({ codigo }) => {
          const permisoId = permisoIdByCodigo.get(codigo);
          if (permisoId === undefined) {
            throw new Error(`Permission missing from seed: ${codigo}`);
          }
          return { rolId: rolCreado.id, permisoId };
        }),
      });
    }
  });
}
