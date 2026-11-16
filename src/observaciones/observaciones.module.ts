import { Module } from '@nestjs/common';
import { ObservacionesController } from './observaciones.controller';
import { ObservacionesService } from './observaciones.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ObservacionesController],
  providers: [ObservacionesService]
})
export class ObservacionesModule {}
