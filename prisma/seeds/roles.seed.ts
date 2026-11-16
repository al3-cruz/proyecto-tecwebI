import type { PrismaClient } from '../../src/generated/prisma/client';

const PERMISOS_BASE = [
  {
    codigo: 'tramites:crear',
    descripcion: 'Crear trámites de compraventa DDRR.',
  },
  {
    codigo: 'tramites:leer',
    descripcion: 'Consultar trámites de compraventa DDRR.',
  },
  {
    codigo: 'tramites:actualizar',
    descripcion: 'Actualizar datos y requisitos de compraventa DDRR.',
  },
  {
    codigo: 'tramites:avanzar_etapa',
    descripcion: 'Avanzar etapas de trámites de compraventa DDRR.',
  },
  {
    codigo: 'tramites:eliminar',
    descripcion: 'Eliminar trámites de compraventa DDRR.',
  },
  {
    codigo: 'usuarios:leer',
    descripcion: 'Consultar usuarios y sus roles.',
  },
  {
    codigo: 'usuarios:asignar_roles',
    descripcion: 'Asignar roles a usuarios.',
  },
  {
    codigo: 'roles:leer',
    descripcion: 'Consultar roles y permisos disponibles.',
  },
  {
    codigo: 'roles:actualizar_permisos',
    descripcion: 'Actualizar los permisos asociados a un rol.',
  },
] as const;

const permisosAdmin = PERMISOS_BASE.map(({ codigo }) => ({ codigo }));
const permisosOperador = permisosAdmin.filter(
  ({ codigo }) =>
    codigo.startsWith('tramites:') && codigo !== 'tramites:eliminar',
);
const permisosCiudadano = permisosAdmin.filter(
  ({ codigo }) =>
    codigo.startsWith('tramites:') && codigo !== 'tramites:eliminar',
);

export async function seedRoles(prisma: PrismaClient): Promise<void> {
  for (const permiso of PERMISOS_BASE) {
    await prisma.permiso.upsert({
      where: { codigo: permiso.codigo },
      create: permiso,
      update: { descripcion: permiso.descripcion },
    });
  }

  const rolesBase = [
    { codigo: 'ADMIN', nombre: 'Administrador', permisos: permisosAdmin },
    {
      codigo: 'GESTOR',
      nombre: 'Gestor de trámites',
      permisos: permisosOperador,
    },
    { codigo: 'CLIENTE', nombre: 'Cliente', permisos: permisosCiudadano },
    {
      codigo: 'CIUDADANO',
      nombre: 'Usuario ciudadano',
      permisos: permisosCiudadano,
    },
  ] as const;

  for (const rol of rolesBase) {
    const { permisos, ...datosRol } = rol;
    await prisma.rol.upsert({
      where: { codigo: rol.codigo },
      create: {
        ...datosRol,
        permisos: { connect: permisos },
      },
      update: {
        nombre: rol.nombre,
        permisos: { set: permisos },
      },
    });
  }
}
