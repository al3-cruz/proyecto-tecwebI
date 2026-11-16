import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { CompraventasController } from './compraventas.controller.js';
import { CompraventasService } from './compraventas.service.js';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [CompraventasController],
  providers: [CompraventasService],
  exports: [CompraventasService],
})
export class CompraventasModule {}
