import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { UbicacionesController } from "./ubicaciones.controller.js";
import { UbicacionesService } from "./ubicaciones.service.js";

@Module({
  imports: [AuthModule],
  controllers: [UbicacionesController],
  providers: [UbicacionesService],
})
export class UbicacionesModule {}
