import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegistrarDto } from './dto/registrar.dto.js';
import { PasswordService } from './password.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
  ) {}

  async registrar(dto: RegistrarDto): Promise<{
    mensaje: string;
    usuario: { id: number; email: string; createdAt: Date };
  }> {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.usuario.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('El correo electrónico ya está registrado.');
    }

    const passwordHash = await this.passwordService.hashPassword(dto.password);
    try {
      const usuario = await this.prisma.usuario.create({
        data: {
          email,
          passwordHash,
          roles: { connect: { codigo: 'CIUDADANO' } },
        },
        select: { id: true, email: true, createdAt: true },
      });
      return {
        mensaje: 'Usuario registrado correctamente.',
        usuario,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'El correo electrónico ya está registrado.',
        );
      }
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<{ access_token: string }> {
    const email = dto.email.trim().toLowerCase();
    const usuario = await this.prisma.usuario.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
      },
    });
    const passwordValido = await this.passwordService.verifyOrDummy(
      dto.password,
      usuario?.passwordHash,
    );
    if (!usuario || !passwordValido) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (this.passwordService.needsRehash(usuario.passwordHash)) {
      const passwordHash = await this.passwordService.hashPassword(
        dto.password,
      );
      await this.prisma.usuario.update({
        where: { id: usuario.id },
        data: { passwordHash },
      });
    }

    const access_token = await this.jwtService.signAsync({
      sub: usuario.id,
      email: usuario.email,
    });
    return { access_token };
  }
}
