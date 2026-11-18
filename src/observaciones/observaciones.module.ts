import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { ObservacionesController } from "./observaciones.controller";
import { ObservacionesService } from "./observaciones.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [ObservacionesController],
  providers: [ObservacionesService],
})
export class ObservacionesModule {}
