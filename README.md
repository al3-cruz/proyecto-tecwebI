# Propiedad al Día — API

API REST para la gestión de trámites y recursos relacionados con el Registro Público de Derechos Reales de Bolivia. Está construida con NestJS 12, TypeScript y Prisma ORM 7, y expone sus endpoints bajo `/api/v1`.

El catálogo, las oficinas, las cuentas y los trámites de compraventa se almacenan en PostgreSQL 17 usando `@prisma/adapter-pg`. La API incluye autenticación JWT, control de acceso por roles y permisos (RBAC), aislamiento por propietario para trámites, borrado lógico y auditoría de escrituras.

> **Aviso sobre la ficha:** el seed contiene una ficha informativa configurada para la oficina de Sucre. Los requisitos, aranceles, plazos y oficinas pueden depender del caso y de normativa actualizada. Confirma la información con Derechos Reales antes de usarla como asesoría oficial.

## Requisitos

- Node.js compatible con NestJS 12 y npm
- Docker Desktop y Docker Compose (para la base local incluida), o una instancia PostgreSQL 17 compatible

## Instalación y configuración local

Instala las dependencias y crea manualmente el archivo `.env` en la raíz del proyecto (no se incluye un `.env.example`):

```bash
npm install
```

`.env` se carga desde la raíz del proyecto. La configuración de Compose incluida usa PostgreSQL en el puerto host `5436`; asegúrate de que `DATABASE_URL` coincida:

```dotenv
PORT=3001
CORS_ORIGINS="http://localhost:3000,http://localhost:5173"
DATABASE_URL="postgresql://postgres:postgres@localhost:5436/propiedad_al_dia?schema=public"
JWT_SECRET="reemplazar-por-un-secreto-aleatorio-de-al-menos-32-caracteres"
```

El seed también requiere estas variables en `.env`:

```dotenv
SEED_ADMIN_EMAIL="admin@example.com"
SEED_ADMIN_PASSWORD="reemplazar-por-una-clave-segura"
```

Genera un secreto JWT criptográficamente aleatorio de al menos 32 caracteres y guárdalo solo en `.env`. No uses valores de ejemplo en una instancia real ni publiques secretos. `.env` está excluido de Git.

### Iniciar PostgreSQL y preparar la base

```bash
docker compose up -d
npm run prisma:validate
npm run prisma:generate
npm run db:migrate
npm run db:seed
```

`compose.yaml` inicia `postgres:17-alpine`, publica el puerto `5436` del host, usa el contenedor `propiedad_al_dia_db` y conserva los datos en un volumen Docker.

- `npm run db:migrate`: aplica migraciones en modo de desarrollo.
- `npm run db:deploy`: aplica migraciones existentes en despliegues.
- `npm run prisma:generate` (también `npm run db:generate`): genera el cliente en `src/generated/prisma`.
- `npm run db:seed`: crea/actualiza oficinas y fichas del catálogo; se puede ejecutar repetidamente.

Para crear una migración de desarrollo después de editar `prisma/schema.prisma`:

```bash
npx prisma migrate dev --name nombre_descriptivo
```

## Ejecutar la API

```bash
# Desarrollo con recarga automática
npm run start:dev

# Compilar y ejecutar
npm run build
npm run start:prod
```

Con los valores predeterminados:

- API: `http://localhost:3001/api/v1`
- Swagger: `http://localhost:3001/api/v1/docs`

Swagger documenta los endpoints, DTOs y autenticación Bearer. La validación global transforma los tipos, permite solo propiedades declaradas por los DTOs y rechaza campos no permitidos.

`CORS_ORIGINS` es una lista separada por comas de los orígenes frontend autorizados; por defecto permite `localhost:3000` y `localhost:5173`. Configura los dominios reales del frontend en producción y no uses `*`. La API aplica un límite global de 100 solicitudes por minuto y uno más estricto de 5 por minuto a cada endpoint de login y registro. El contador predeterminado se mantiene en memoria por instancia, por lo que un despliegue con varias instancias debe usar almacenamiento compartido o limitar solicitudes en el proxy.

## Autenticación y cuentas

El módulo `auth` ofrece:

| Método | Ruta                    | Descripción                           |
| ------ | ----------------------- | ------------------------------------- |
| `POST` | `/api/v1/auth/registro` | Registra una cuenta                   |
| `POST` | `/api/v1/auth/login`    | Valida credenciales y devuelve un JWT |

Ejemplo de registro:

```bash
curl -X POST http://localhost:3001/api/v1/auth/registro \
  -H 'Content-Type: application/json' \
  -d '{"email":"persona@example.com","password":"UnaClaveSegura123"}'
```

La respuesta de registro no contiene el hash de la contraseña. El email se normaliza a minúsculas y sin espacios externos; una cuenta duplicada produce `409`. Las contraseñas deben tener entre 12 y 72 caracteres. El hash nuevo se genera mediante Argon2id; los hashes bcrypt y scrypt heredados se verifican y actualizan al iniciar sesión. Los errores de login son genéricos (`401`).

Login:

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"persona@example.com","password":"UnaClaveSegura123"}'
```

Envía el token obtenido en `Authorization: Bearer <token>` al llamar endpoints de trámites. Los JWT expiran en una hora y usan el emisor `padia-api-tramites` y la audiencia `padia-client`.

## Catálogo de trámites y compraventas

Todas las rutas de `/api/v1/tramites` requieren JWT. El catálogo es compartido: los usuarios autenticados pueden consultar, filtrar, verificar requisitos y ver trámites relacionados. Solo `ADMIN` puede crear, editar o eliminar fichas, añadir requisitos y consultar las estadísticas globales. La identidad del administrador que registra una ficha se toma del JWT.

| Método   | Ruta                                        | Descripción                                              |
| -------- | ------------------------------------------- | -------------------------------------------------------- |
| `GET`    | `/api/v1/tramites`                          | Lista, pagina y filtra el catálogo compartido            |
| `POST`   | `/api/v1/tramites`                          | `ADMIN`: crea una ficha con requisitos, pasos y oficinas |
| `GET`    | `/api/v1/tramites/estadisticas`             | `ADMIN`: estadísticas globales del catálogo              |
| `GET`    | `/api/v1/tramites/:id`                      | Obtiene ficha y relaciones                               |
| `POST`   | `/api/v1/tramites/:id/verificar-requisitos` | Comprueba documentos y estima fecha hábil                |
| `GET`    | `/api/v1/tramites/:id/relacionados`         | Sugiere hasta cuatro trámites relacionados               |
| `POST`   | `/api/v1/tramites/:id/requisitos`           | `ADMIN`: añade un requisito                              |
| `PUT`    | `/api/v1/tramites/:id`                      | `ADMIN`: reemplaza la ficha completa                     |
| `PATCH`  | `/api/v1/tramites/:id`                      | `ADMIN`: actualiza solo los campos enviados              |
| `DELETE` | `/api/v1/tramites/:id`                      | `ADMIN`: elimina una ficha                               |

Los permisos de catálogo (`tramites:crear`, `tramites:actualizar`, `tramites:eliminar`) no bastan para editarlo: las rutas de escritura exigen además el rol `ADMIN`. Los parámetros `:id` se validan como enteros y los códigos internos son únicos, entre 1 y 53.

### Paginación y filtros

`GET /api/v1/tramites` admite:

| Parámetro         | Uso                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------- |
| `page`            | Página, desde 1; predeterminado `1`                                                 |
| `limit`           | Elementos por página, predeterminado `10`, máximo `50`                              |
| `search`          | Búsqueda sin distinguir mayúsculas en título, finalidad o descripción de requisitos |
| `modalidad`       | `PRESENCIAL`, `VIRTUAL` o `MIXTA`                                                   |
| `oficinaId`       | Filtra por una oficina relacionada                                                  |
| `plazoMaximoDias` | Filtra por plazo máximo inclusivo                                                   |

Ejemplo:

```text
GET /api/v1/tramites?page=1&limit=10&search=hipoteca&modalidad=PRESENCIAL&plazoMaximoDias=3
```

La respuesta contiene `{ "data": [...], "meta": { "total", "page", "limit", "lastPage" } }`. Cada elemento incluye sus requisitos, pasos y oficinas.

### Ficha de trámite

El modelo `Tramite` incluye código interno y código oficial, título, finalidad, institución responsable, modalidad, plazo de entrega, nota de requisitos, documentos entregables, base legal y fecha de actualización oficial. La solicitud recibe `institucionId` y `oficinaIds`; una fecha de actualización debe ser una fecha ISO 8601.

- `RequisitoTramite` contiene nombre, descripción (`detalle`), indicador `obligatorio`, orden y nota condicional.
- `PasoProcedimiento` contiene orden, título, descripción y plazo opcional.
- `institucionId` referencia el catálogo `Institucion`, `oficinaIds` relaciona uno o más registros de `Oficina`, y `tramitadorId` identifica al propietario autenticado del trámite. `clienteId` es opcional.
- `documentosEntregables` se persiste como registros relacionados; en el DTO de escritura se envía como una lista de nombres.
- Las modalidades persistidas son el enum `PRESENCIAL`, `VIRTUAL` y `MIXTA`.

La verificación de requisitos indica los obligatorios y opcionales faltantes, el porcentaje de cumplimiento y una fecha estimada calculada en días hábiles de lunes a viernes. Las estadísticas incluyen totales, plazo promedio y distribución por modalidad y oficina. Los trámites relacionados comparten modalidad u oficina.

### Fichas iniciales

El seed carga o actualiza esta ficha oficial:

| Código oficial | Trámite                                    |
| -------------- | ------------------------------------------ |
| `1`            | Corrección de datos de identidad (Ley 247) |

Está asociada a `CHQ-SUCRE-CENTRAL`, Oficina Central de Sucre, en Av. Venezuela esq. Ladislao Cabrera (edificio TDJ), municipio de Sucre, departamento de Chuquisaca. La ficha incluye seis requisitos, cinco pasos y dos documentos entregables.

El seed crea o actualiza la cuenta indicada por `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD`, le asigna el rol `ADMIN` y la ficha. La contraseña se almacena con Argon2id. Al volver a ejecutar el seed, también se actualiza la contraseña de esa cuenta con el valor configurado en `.env`.

> **Importante:** `npm run db:seed` no limpia el catálogo completo: actualiza la ficha con código oficial `1`, sus requisitos, pasos y oficina asociada, y desactiva las oficinas antiguas `LPZ-CENTRAL`, `CBB-CENTRAL`, `SCZ-CENTRAL` y `CHQ-SUCRE-MODULO`.

## Direcciones y módulos relacionados

`/api/v1/direcciones` administra direcciones personales guardadas en PostgreSQL. Admite filtrar por `usuarioId`; cada dirección requiere `municipioId` de una ubicación de tipo `MUNICIPIO` y devuelve la jerarquía municipio, provincia y departamento. Las direcciones no se relacionan directamente con trámites; estos se vinculan con el catálogo `Oficina`.

`GET /api/v1/ubicaciones` lista los departamentos. Envía `padreId` para obtener los hijos de una ubicación y recorrer la jerarquía de departamentos, provincias y municipios.

Las oficinas pueden incluir `latitud` y `longitud`. Para calcular una ruta hasta una oficina registrada:

```http
GET /api/v1/direcciones/CHQ-SUCRE-CENTRAL/ruta-gps?origenLatitud=-19.0333&origenLongitud=-65.2627&modo=driving
```

`modo` es opcional y acepta `driving` o `foot` (por defecto, `driving`). La respuesta incluye distancia, duración, geometría GeoJSON, pasos de navegación y un enlace de Google Maps. Si OSRM no está disponible o no puede calcular esa ruta, la API devuelve la distancia Haversine, `duracionSegundos: null`, geometría nula y el enlace directo a Google Maps.

El módulo de observaciones valida que el trámite asociado exista, pero las observaciones siguen almacenándose en memoria. Los módulos de usuarios de perfil, tareas y eventos también conservan almacenamiento en memoria; son independientes de las cuentas de autenticación de `auth`.

Todas las rutas de `/api/v1/usuarios` requieren JWT y rol `ADMIN`, incluida la consulta, creación, modificación y eliminación de usuarios. El registro público se realiza mediante `POST /api/v1/auth/registro`. Las rutas de `direcciones`, `observaciones`, `tareas`, `eventos` y `ubicaciones` requieren JWT; Swagger muestra el candado para estas operaciones. Revisa Swagger para el contrato vigente de cada recurso.

## Trámites de compraventa

El módulo `/api/v1/compraventas` gestiona trámites de transferencia de propiedad en PostgreSQL. Requiere JWT y permisos RBAC; las operaciones se limitan a los trámites del usuario autenticado, excepto para el rol `ADMIN`, que puede consultar y operar sobre todos.

| Método   | Ruta                                                         | Permiso                      | Descripción                                                                    |
| -------- | ------------------------------------------------------------ | ---------------------------- | ------------------------------------------------------------------------------ |
| `POST`   | `/api/v1/compraventas`                                       | `compraventas:crear`         | Crea un trámite propio y sus requisitos; genera un código `DDRR-CV-AAAA-NNNN`  |
| `GET`    | `/api/v1/compraventas`                                       | `compraventas:leer`          | Lista los trámites propios; `ADMIN` puede consultar todos                      |
| `GET`    | `/api/v1/compraventas/:id`                                   | `compraventas:leer`          | Obtiene un trámite propio y sus requisitos; `ADMIN` puede consultar cualquiera |
| `PATCH`  | `/api/v1/compraventas/:id`                                   | `compraventas:actualizar`    | Actualiza arancel, pago u observaciones del trámite propio                     |
| `PATCH`  | `/api/v1/compraventas/:id/requisitos/:requisitoId/verificar` | `compraventas:actualizar`    | Registra originales, fotocopias y verificación                                 |
| `PATCH`  | `/api/v1/compraventas/:id/confirmar-preimpresion`            | `compraventas:actualizar`    | Confirma la revisión de la pre-impresión                                       |
| `PATCH`  | `/api/v1/compraventas/:id/avanzar-etapa`                     | `compraventas:avanzar_etapa` | Avanza el flujo o marca el trámite propio como observado                       |
| `DELETE` | `/api/v1/compraventas/:id`                                   | `compraventas:eliminar`      | Elimina lógicamente un trámite; reservado a `ADMIN`                            |

Un trámite registra folio real, datos del vendedor y comprador, condición de bien ganancial, apoderado opcional y monto del arancel. Las observaciones se guardan como mensajes inmutables en la bitácora junto con el autor y la fecha; la bitácora también documenta los motivos de observación y los comentarios enviados durante los cambios de etapa. Se crean cinco requisitos base; si hay apoderado, también se exige el poder notarial. Los códigos usan una secuencia por año.

El flujo es `VENTANILLA_INFORMACIONES` → `INSCRIPCION_RAPIDA` → `PRE_IMPRESION_REVISION` → `EN_PROCESO_REGISTRO` → `LISTO_PARA_DEVOLUCION` → `ENTREGADO`. Para avanzar se valida el cumplimiento correspondiente: originales y al menos dos fotocopias por requisito antes de inscripción rápida; arancel pagado antes de pre-impresión; pre-impresión confirmada antes del registro; y confirmación de entrega del Folio Real actualizado y Testimonio sellado al entregar. La fecha estimada se calcula con tres días hábiles (lunes a viernes, sin calendario de feriados). Un trámite observado conserva la etapa anterior y solo puede volver a ella. No se puede eliminar un trámite en proceso de registro o ya entregado.

## Roles, permisos y auditoría

El seed crea o actualiza los roles `ADMIN`, `PROFESIONAL` y `CIUDADANO`. Las fichas del catálogo usan permisos `tramites:*`, y sus escrituras también exigen rol `ADMIN`. Las operaciones personales de compraventa usan permisos separados `compraventas:*`; `CIUDADANO` y `PROFESIONAL` pueden iniciar y gestionar sus propios trámites, pero no eliminarlos. Las cuentas registradas reciben `CIUDADANO`. Solo `ADMIN` recibe permisos de administración y eliminación.

| Método  | Ruta                         | Acceso            | Descripción                                         |
| ------- | ---------------------------- | ----------------- | --------------------------------------------------- |
| `GET`   | `/api/v1/usuarios`           | JWT + rol `ADMIN` | Lista usuarios activos y sus roles, sin hashes      |
| `PATCH` | `/api/v1/usuarios/:id/roles` | JWT + rol `ADMIN` | Reemplaza roles usando `rolesIds` o `codigos`       |
| `GET`   | `/api/v1/roles`              | JWT + rol `ADMIN` | Lista roles y permisos                              |
| `PATCH` | `/api/v1/roles/:id/permisos` | JWT + rol `ADMIN` | Reemplaza permisos usando `permisosIds` o `codigos` |

Los permisos se asocian a los roles mediante la relación explícita `RolPermiso`; la asignación reemplaza sus filas de enlace en una transacción.

## Instituciones

Todas las rutas de `/api/v1/instituciones` requieren un JWT. Los usuarios autenticados pueden consultar `GET /api/v1/instituciones`; crear una institución con `POST` o eliminarla con `DELETE /api/v1/instituciones/:id` requiere rol `ADMIN`. No se permite eliminar una institución que ya esté asociada a fichas del catálogo.

El borrado de trámites, trámites de compraventa, direcciones y cuentas persistidas es lógico: las filas se conservan con `deletedAt` y se excluyen automáticamente de las consultas normales. La extensión de Prisma registra en `AuditLog` las escrituras (`CREATE`, `UPDATE`, `DELETE` y `RESTORE`), incluyendo el usuario autenticado cuando está disponible y los datos anteriores/nuevos. Los campos sensibles, como hashes de contraseñas y tokens, se redactan en el registro.

## `PUT` y `PATCH`

- `PUT /recurso/:id` reemplaza los campos editables y requiere la ficha completa.
- `PATCH /recurso/:id` modifica solo los campos enviados.

En un `PUT` de trámite también se reemplazan sus listas anidadas de requisitos, pasos y oficinas. En un `PATCH`, las relaciones solo se modifican si se envían en el cuerpo.

## Postman

Los endpoints de compraventa y administración de roles también requieren un JWT Bearer; puedes probarlos y consultar sus DTOs en Swagger.

Importa [`postman/propiedad-al-dia.postman_collection.json`](./postman/propiedad-al-dia.postman_collection.json). Su variable `baseUrl` usa `http://localhost:3001/api/v1`; cámbiala si modificas `PORT`.

Para las solicitudes de `/tramites`, obtén un token mediante `/auth/login` y configúralo como Bearer Token en Postman. La colección contiene ejemplos de las operaciones CRUD de recursos; las rutas avanzadas del catálogo y los esquemas JWT se documentan en Swagger.

## Verificación

```bash
npm run prisma:validate
npm run build
npm test -- --runInBand
npm run lint
```

Para ejecutar pruebas e2e:

```bash
npm run test:e2e
```
