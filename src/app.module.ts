import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TramitesModule } from './tramites/tramites.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { ObservacionesModule } from './observaciones/observaciones.module';
import { DireccionesModule } from './direcciones/direcciones.module';
import { TareasModule } from './tareas/tareas.module';
import { EventosModule } from './eventos/eventos.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module.js';
import { CompraventasModule } from './compraventas/compraventas.module.js';
import { AuditUserInterceptor } from './common/interceptors/audit-user.interceptor.js';
import { RolesModule } from './roles/roles.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    TramitesModule,
    UsuariosModule,
    ObservacionesModule,
    DireccionesModule,
    TareasModule,
    EventosModule,
    CompraventasModule,
    RolesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_INTERCEPTOR, useClass: AuditUserInterceptor },
  ],
})
export class AppModule {}
