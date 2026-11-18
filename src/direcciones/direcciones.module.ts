import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DireccionesController } from "./direcciones.controller";
import { DireccionesService } from "./direcciones.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [DireccionesController],
  providers: [DireccionesService],
})
export class DireccionesModule {}
