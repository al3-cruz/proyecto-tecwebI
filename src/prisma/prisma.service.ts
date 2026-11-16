import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../generated/prisma/client';
import {
  createPrismaExtension,
  prismaTransactionContext,
} from './prisma.extension';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  static create(configService: ConfigService): PrismaService {
    const baseClient = new PrismaService(configService);
    const extendedClient = baseClient.$extends(
      createPrismaExtension(baseClient),
    );

    return new Proxy(baseClient, {
      get(target, property, receiver) {
        if (property === 'onModuleInit' || property === 'onModuleDestroy') {
          return Reflect.get(target, property, receiver);
        }
        if (property === '$transaction') {
          return (
            argument: unknown,
            options?: unknown,
          ): Promise<unknown> => {
            const transact = (...args: unknown[]) =>
              Reflect.apply(
                extendedClient.$transaction,
                extendedClient,
                args,
              ) as Promise<unknown>;
            if (typeof argument !== 'function') {
              return transact(argument, options);
            }

            const callback = argument as (
              transaction: Prisma.TransactionClient,
            ) => unknown;
            return transact(
              (transaction: Prisma.TransactionClient) =>
                prismaTransactionContext.run(transaction, () =>
                  callback(transaction),
                ),
              options,
            );
          };
        }
        const value = Reflect.get(extendedClient, property, extendedClient);
        return typeof value === 'function' ? value.bind(extendedClient) : value;
      },
    }) as PrismaService;
  }

  constructor(configService: ConfigService) {
    super({
      adapter: new PrismaPg({
        connectionString: configService.getOrThrow<string>('DATABASE_URL'),
      }),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
