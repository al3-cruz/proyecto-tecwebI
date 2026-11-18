import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegistrarDto } from './dto/registrar.dto.js';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('registro')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Registrar una cuenta' })
  @ApiCreatedResponse({ description: 'Cuenta creada sin exponer su contraseña.' })
  registrar(@Body() dto: RegistrarDto) {
    return this.authService.registrar(dto);
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión y obtener un JWT' })
  @ApiOkResponse({ description: 'Token de acceso firmado.' })
  @ApiUnauthorizedResponse({ description: 'Credenciales inválidas' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
