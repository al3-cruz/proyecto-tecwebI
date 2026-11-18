import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { EventosController } from "./eventos.controller";
import { EventosService } from "./eventos.service";

@Module({
  imports: [AuthModule],
  controllers: [EventosController],
  providers: [EventosService],
})
export class EventosModule {}
