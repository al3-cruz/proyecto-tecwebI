import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { InstitucionesController } from "./instituciones.controller.js";
import { InstitucionesService } from "./instituciones.service.js";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [InstitucionesController],
  providers: [InstitucionesService],
})
export class InstitucionesModule {}
