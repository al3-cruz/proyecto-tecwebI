import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { PermissionsGuard } from './permissions.guard.js';
import { RolesGuard } from './roles.guard.js';
import { PasswordService } from './password.service.js';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret || secret.length < 32 || secret.startsWith('CAMBIAR_')) {
          throw new Error(
            'JWT_SECRET debe tener al menos 32 caracteres y no puede ser el placeholder.',
          );
        }
        return {
          secret,
          signOptions: {
            expiresIn: '1h',
            issuer: 'padia-api-tramites',
            audience: 'padia-client',
          },
          verifyOptions: {
            issuer: 'padia-api-tramites',
            audience: 'padia-client',
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    JwtAuthGuard,
    PermissionsGuard,
    RolesGuard,
  ],
  exports: [JwtAuthGuard, JwtModule, PermissionsGuard, RolesGuard],
})
export class AuthModule {}
