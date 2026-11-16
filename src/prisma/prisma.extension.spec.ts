import { RequestContext } from '../common/context/request-context';
import { Prisma, type PrismaClient } from '../generated/prisma/client';
import {
  createPrismaExtension,
  prismaTransactionContext,
} from './prisma.extension';

interface ExtensionQueryHook {
  $allModels: {
    $allOperations: (context: {
      model: string;
      operation: string;
      args: Record<string, unknown>;
      query: (args: Record<string, unknown>) => Promise<unknown>;
    }) => Promise<unknown>;
  };
}

describe('Prisma soft-delete and audit extension', () => {
  const tramite = {
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  };
  const usuario = { ...tramite };
  const auditLog = { create: jest.fn() };
  let hook: ExtensionQueryHook['$allModels']['$allOperations'];

  beforeEach(() => {
    jest.clearAllMocks();
    const fakeClient = {
      $extends: (extension: unknown) => extension,
      tramite,
      usuario,
      auditLog,
    };
    const fakeExtensionClient = fakeClient as unknown as PrismaClient;
    const extension = createPrismaExtension(fakeExtensionClient)(
      fakeExtensionClient,
    ) as unknown as {
      query: ExtensionQueryHook;
    };
    hook = extension.query.$allModels.$allOperations;
  });

  it('filters soft-deleted records and respects explicit deletedAt filters', async () => {
    const query = jest.fn().mockResolvedValue([]);

    await hook({
      model: 'Tramite',
      operation: 'findMany',
      args: { where: { usuarioId: 7 } },
      query,
    });

    expect(query).toHaveBeenCalledWith({
      where: { usuarioId: 7, deletedAt: null },
    });

    query.mockClear();
    await hook({
      model: 'Tramite',
      operation: 'findMany',
      args: { where: { deletedAt: { not: null } } },
      query,
    });
    expect(query).toHaveBeenCalledWith({
      where: { deletedAt: { not: null } },
    });
  });

  it('turns delete into an update and writes a DELETE audit event with the actor', async () => {
    const oldRecord = { id: 12, titulo: 'Old title', deletedAt: null };
    const deletedRecord = {
      ...oldRecord,
      deletedAt: new Date('2026-11-13T10:00:00.000Z'),
    };
    tramite.findMany.mockResolvedValue([oldRecord]);
    tramite.update.mockResolvedValue(deletedRecord);
    auditLog.create.mockResolvedValue({});

    const result = await RequestContext.run(7, () =>
      hook({
        model: 'Tramite',
        operation: 'delete',
        args: { where: { id: 12 } },
        query: jest.fn(),
      }),
    );

    expect(result).toBe(deletedRecord);
    expect(tramite.update).toHaveBeenCalledWith({
      where: { id: 12 },
      data: { deletedAt: expect.any(Date) },
    });
    expect(auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entity: 'Tramite',
        entityId: '12',
        action: 'DELETE',
        userId: 7,
      }),
    });
  });

  it('audits updates and records RESTORE when a deleted row is reactivated', async () => {
    const deletedRecord = {
      id: 14,
      titulo: 'Archived',
      deletedAt: new Date('2026-11-12T10:00:00.000Z'),
    };
    const restoredRecord = { id: 14, titulo: 'Restored', deletedAt: null };
    tramite.findMany
      .mockResolvedValueOnce([deletedRecord])
      .mockResolvedValueOnce([restoredRecord]);
    auditLog.create.mockResolvedValue({});

    await RequestContext.run(9, () =>
      hook({
        model: 'Tramite',
        operation: 'update',
        args: { where: { id: 14 }, data: { deletedAt: null } },
        query: jest.fn().mockResolvedValue(restoredRecord),
      }),
    );

    expect(auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityId: '14',
        action: 'RESTORE',
        userId: 9,
      }),
    });
  });

  it('turns deleteMany into one bulk update and audits each affected record', async () => {
    tramite.findMany.mockResolvedValue([
      { id: 20, deletedAt: null },
      { id: 21, deletedAt: null },
    ]);
    tramite.updateMany.mockResolvedValue({ count: 2 });
    auditLog.create.mockResolvedValue({});

    await expect(
      hook({
        model: 'Tramite',
        operation: 'deleteMany',
        args: { where: { usuarioId: 7 } },
        query: jest.fn(),
      }),
    ).resolves.toEqual({ count: 2 });

    expect(tramite.updateMany).toHaveBeenCalledWith({
      where: { usuarioId: 7 },
      data: { deletedAt: expect.any(Date) },
    });
    expect(auditLog.create).toHaveBeenCalledTimes(2);
  });

  it('redacts password hashes in audited user records', async () => {
    const createdUser = {
      id: 3,
      email: 'user@example.com',
      passwordHash: 'secret',
    };
    const query = jest.fn().mockResolvedValue(createdUser);
    auditLog.create.mockResolvedValue({});

    await hook({
      model: 'Usuario',
      operation: 'create',
      args: { data: createdUser },
      query,
    });

    expect(auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entity: 'Usuario',
        action: 'CREATE',
        newData: {
          id: 3,
          email: 'user@example.com',
          passwordHash: '[REDACTED]',
        },
      }),
    });
  });

  it('writes audit records through the active transaction client', async () => {
    const transactionAuditCreate = jest.fn().mockResolvedValue({});
    const transactionClient = {
      tramite,
      auditLog: { create: transactionAuditCreate },
    } as unknown as Prisma.TransactionClient;
    const created = { id: 31, titulo: 'Transactional' };

    await prismaTransactionContext.run(transactionClient, () =>
      hook({
        model: 'Tramite',
        operation: 'create',
        args: { data: created },
        query: jest.fn().mockResolvedValue(created),
      }),
    );

    expect(transactionAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entity: 'Tramite',
          entityId: '31',
          action: 'CREATE',
        }),
      }),
    );
    expect(auditLog.create).not.toHaveBeenCalled();
  });
});
