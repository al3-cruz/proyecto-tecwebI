import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { UsuariosController } from './usuarios.controller';
import { UsuariosAdminService } from './usuarios-admin.service.js';
import { UsuariosService } from './usuarios.service';

@Module({
  imports: [AuthModule],
  controllers: [UsuariosController],
  providers: [UsuariosService, UsuariosAdminService],
  exports: [UsuariosService],
})
export class UsuariosModule {}
