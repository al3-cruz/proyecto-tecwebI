import { AsyncLocalStorage } from 'node:async_hooks';
import { Prisma, type PrismaClient } from '../generated/prisma/client';
import { RequestContext } from '../common/context/request-context';

export const prismaTransactionContext =
  new AsyncLocalStorage<Prisma.TransactionClient>();

const SOFT_DELETE_MODELS = new Set([
  'Tramite',
  'TramiteCompraventa',
  'Direccion',
  'Usuario',
]);

const READ_OPERATIONS = new Set([
  'findUnique',
  'findFirst',
  'findMany',
  'count',
  'aggregate',
]);

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
]);

interface QueryArgs {
  where?: Record<string, unknown>;
  data?: Record<string, unknown>;
  create?: Record<string, unknown>;
  select?: Record<string, unknown>;
  include?: Record<string, unknown>;
  [key: string]: unknown;
}

interface AuditDelegate {
  findMany(args: unknown): Promise<unknown[]>;
  update(args: unknown): Promise<unknown>;
  updateMany(args: unknown): Promise<{ count: number }>;
  delete(args: unknown): Promise<unknown>;
  deleteMany(args: unknown): Promise<{ count: number }>;
}

type DataRecord = Record<string, unknown>;
type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE';

function delegateFor(
  client: PrismaClient | Prisma.TransactionClient,
  model: string,
): AuditDelegate {
  const delegateName = model[0].toLowerCase() + model.slice(1);
  const delegate = (client as unknown as Record<string, unknown>)[delegateName];
  if (!delegate || typeof delegate !== 'object') {
    throw new Error(`Prisma delegate not found for model ${model}.`);
  }
  return delegate as AuditDelegate;
}

function asRecord(value: unknown): DataRecord | null {
  return value !== null && typeof value === 'object'
    ? (value as DataRecord)
    : null;
}

function getId(value: unknown): string | null {
  const record = asRecord(value);
  const id = record?.id ?? record?.anio;
  return typeof id === 'string' || typeof id === 'number' ? String(id) : null;
}

function getIdentityWhere(value: unknown): Record<string, unknown> | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }
  if (typeof record.id === 'string' || typeof record.id === 'number') {
    return { id: record.id };
  }
  if (typeof record.anio === 'number') {
    return { anio: record.anio };
  }
  return null;
}

function redactSensitiveData(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactSensitiveData);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value instanceof Uint8Array) {
    return Buffer.from(value).toString('base64');
  }
  const record = asRecord(value);
  if (!record) {
    return value;
  }
  const prototype = Object.getPrototypeOf(value) as object | null;
  if (prototype !== Object.prototype && prototype !== null) {
    const toJSON = (value as { toJSON?: () => unknown }).toJSON;
    return typeof toJSON === 'function'
      ? redactSensitiveData(toJSON.call(value))
      : String(value);
  }

  return Object.fromEntries(
    Object.entries(record).map(([key, item]) => [
      key,
      SENSITIVE_KEYS.has(key) ? '[REDACTED]' : redactSensitiveData(item),
    ]),
  );
}

function asJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull {
  if (value === null || value === undefined) {
    return Prisma.DbNull;
  }
  const serialized = JSON.stringify(redactSensitiveData(value), (_, item) =>
    typeof item === 'bigint' ? item.toString() : item,
  );
  if (serialized === undefined) {
    return Prisma.DbNull;
  }
  return JSON.parse(serialized) as Prisma.InputJsonValue;
}

function getUpdateAction(
  oldData: unknown,
  data: Record<string, unknown> | undefined,
): AuditAction {
  const oldDeletedAt = asRecord(oldData)?.deletedAt;
  const newDeletedAt = data?.deletedAt;
  if (oldDeletedAt != null && newDeletedAt === null) {
    return 'RESTORE';
  }
  if (oldDeletedAt == null && newDeletedAt instanceof Date) {
    return 'DELETE';
  }
  return 'UPDATE';
}

export function createPrismaExtension(client: PrismaClient) {
  return Prisma.defineExtension({
    name: 'soft-delete-and-audit',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || model === 'AuditLog') {
            return query(args);
          }

          const operationClient = prismaTransactionContext.getStore() ?? client;
          const queryArgs = args as QueryArgs;
          const delegate = delegateFor(operationClient, model);
          const where = queryArgs.where ?? {};
          const hasSoftDelete = SOFT_DELETE_MODELS.has(model);

          if (
            hasSoftDelete &&
            READ_OPERATIONS.has(operation) &&
            !Object.hasOwn(where, 'deletedAt')
          ) {
            return query({
              ...queryArgs,
              where: { ...where, deletedAt: null },
            } as typeof args);
          }

          if (operation === 'delete' && hasSoftDelete) {
            const previous = (
              await delegate.findMany({
                where,
                take: 1,
              })
            )[0];
            const now = new Date();
            const updated = await delegate.update({
              where,
              data: { deletedAt: now },
              ...(queryArgs.select ? { select: queryArgs.select } : {}),
              ...(queryArgs.include ? { include: queryArgs.include } : {}),
            });
            await writeAudit(
              operationClient,
              model,
              'DELETE',
              getId(previous) ?? getId(updated) ?? 'unknown',
              previous,
              updated,
            );
            return updated;
          }

          if (operation === 'deleteMany' && hasSoftDelete) {
            const previous = await delegate.findMany({ where });
            const deletedAt = new Date();
            const result = await delegate.updateMany({
              where,
              data: { deletedAt },
            });
            await Promise.all(
              previous.map((record) =>
                writeAudit(
                  operationClient,
                  model,
                  'DELETE',
                  getId(record) ?? 'unknown',
                  record,
                  { deletedAt },
                ),
              ),
            );
            return result;
          }

          if (operation === 'create') {
            const created = await query(args);
            await writeAudit(
              operationClient,
              model,
              'CREATE',
              getId(created) ?? 'unknown',
              null,
              created,
            );
            return created;
          }

          if (operation === 'update' || operation === 'upsert') {
            const previous =
              (await delegate.findMany({ where, take: 1 }))[0] ?? null;
            const result = await query(args);
            const identity =
              getIdentityWhere(previous) ??
              getIdentityWhere(result) ??
              getIdentityWhere(queryArgs.create);
            const id =
              getId(previous) ??
              getId(result) ??
              getId(queryArgs.create) ??
              'unknown';
            const current = identity
              ? ((await delegate.findMany({ where: identity, take: 1 }))[0] ??
                result)
              : result;
            const data =
              operation === 'upsert'
                ? previous
                  ? queryArgs.update
                  : queryArgs.create
                : queryArgs.data;
            const action = previous
              ? getUpdateAction(previous, asRecord(data) ?? undefined)
              : 'CREATE';
            await writeAudit(
              operationClient,
              model,
              action,
              id,
              previous,
              current,
            );
            return result;
          }

          if (operation === 'updateMany') {
            const previous = await delegate.findMany({ where });
            const result = await query(args);
            const identities = previous
              .map(getIdentityWhere)
              .filter(
                (identity): identity is Record<string, unknown> =>
                  identity !== null,
              );
            const identityKey = identities[0]
              ? Object.keys(identities[0])[0]
              : undefined;
            const ids = identities.map((identity) =>
              identityKey ? identity[identityKey] : undefined,
            );
            const current =
              identityKey && ids.length
                ? await delegate.findMany({
                    where: { [identityKey]: { in: ids } },
                  })
                : [];
            const currentById = new Map(
              current
                .map((record) => [getId(record), record] as const)
                .filter(
                  (entry): entry is readonly [string, unknown] =>
                    entry[0] !== null,
                ),
            );
            await Promise.all(
              previous.map((record) => {
                const id = getId(record) ?? 'unknown';
                const action = getUpdateAction(
                  record,
                  asRecord(queryArgs.data) ?? undefined,
                );
                return writeAudit(
                  operationClient,
                  model,
                  action,
                  id,
                  record,
                  currentById.get(id) ?? { data: queryArgs.data },
                );
              }),
            );
            return result;
          }

          if (operation === 'delete') {
            const previous =
              (await delegate.findMany({ where, take: 1 }))[0] ?? null;
            const result = await query(args);
            await writeAudit(
              operationClient,
              model,
              'DELETE',
              getId(previous) ?? getId(result) ?? 'unknown',
              previous,
              null,
            );
            return result;
          }

          if (operation === 'deleteMany') {
            const previous = await delegate.findMany({ where });
            const result = await query(args);
            await Promise.all(
              previous.map((record) =>
                writeAudit(
                  operationClient,
                  model,
                  'DELETE',
                  getId(record) ?? 'unknown',
                  record,
                  null,
                ),
              ),
            );
            return result;
          }

          return query(args);
        },
      },
    },
  });
}

async function writeAudit(
  client: PrismaClient | Prisma.TransactionClient,
  entity: string,
  action: AuditAction,
  entityId: string,
  oldData: unknown,
  newData: unknown,
): Promise<void> {
  await client.auditLog.create({
    data: {
      entity,
      entityId,
      action,
      userId: RequestContext.getUserId(),
      oldData: asJson(oldData),
      newData: asJson(newData),
    },
  });
}
