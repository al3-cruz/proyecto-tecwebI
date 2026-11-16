import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service.js';
import { PasswordService } from './password.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtService } from '@nestjs/jwt';

describe('AuthService', () => {
  let service: AuthService;
  const prismaMock = {
    usuario: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  const passwordMock = {
    hashPassword: jest.fn(),
    verifyOrDummy: jest.fn(),
    needsRehash: jest.fn(),
  };
  const jwtMock = { signAsync: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    passwordMock.needsRehash.mockReturnValue(false);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: PasswordService, useValue: passwordMock },
        { provide: JwtService, useValue: jwtMock },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  it('registers normalized emails without returning the password hash', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    prismaMock.usuario.findUnique.mockResolvedValue(null);
    passwordMock.hashPassword.mockResolvedValue('stored-hash');
    prismaMock.usuario.create.mockResolvedValue({
      id: 5,
      email: 'person@example.com',
      createdAt,
    });

    const response = await service.registrar({
      email: ' Person@Example.com ',
      password: 'UnaClaveSegura123',
    });

    expect(prismaMock.usuario.create).toHaveBeenCalledWith({
      data: {
        email: 'person@example.com',
        passwordHash: 'stored-hash',
        roles: { connect: { codigo: 'CIUDADANO' } },
      },
      select: { id: true, email: true, createdAt: true },
    });
    expect(response.usuario).not.toHaveProperty('passwordHash');
  });

  it('rejects duplicate registrations with HTTP 409', async () => {
    prismaMock.usuario.findUnique.mockResolvedValue({ id: 1 });

    await expect(
      service.registrar({
        email: 'person@example.com',
        password: 'UnaClaveSegura123',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prismaMock.usuario.create).not.toHaveBeenCalled();
  });

  it('returns a JWT after a successful login', async () => {
    prismaMock.usuario.findUnique.mockResolvedValue({
      id: 5,
      email: 'person@example.com',
      passwordHash: 'stored-hash',
    });
    passwordMock.verifyOrDummy.mockResolvedValue(true);
    jwtMock.signAsync.mockResolvedValue('signed-token');

    await expect(
      service.login({
        email: ' Person@Example.com ',
        password: 'UnaClaveSegura123',
      }),
    ).resolves.toEqual({ access_token: 'signed-token' });
    expect(jwtMock.signAsync).toHaveBeenCalledWith({
      sub: 5,
      email: 'person@example.com',
    });
    expect(prismaMock.usuario.update).not.toHaveBeenCalled();
  });

  it('rehashes legacy passwords after a successful login', async () => {
    prismaMock.usuario.findUnique.mockResolvedValue({
      id: 5,
      email: 'person@example.com',
      passwordHash: 'legacy-hash',
    });
    passwordMock.verifyOrDummy.mockResolvedValue(true);
    passwordMock.needsRehash.mockReturnValue(true);
    passwordMock.hashPassword.mockResolvedValue('argon2id-hash');
    jwtMock.signAsync.mockResolvedValue('signed-token');

    await expect(
      service.login({
        email: 'person@example.com',
        password: 'UnaClaveSegura123!',
      }),
    ).resolves.toEqual({ access_token: 'signed-token' });
    expect(prismaMock.usuario.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { passwordHash: 'argon2id-hash' },
    });
  });

  it('returns the same generic 401 for invalid credentials', async () => {
    prismaMock.usuario.findUnique.mockResolvedValue(null);
    passwordMock.verifyOrDummy.mockResolvedValue(false);

    await expect(
      service.login({
        email: 'unknown@example.com',
        password: 'UnaClaveSegura123',
      }),
    ).rejects.toMatchObject({
      constructor: UnauthorizedException,
      message: 'Credenciales inválidas',
    });
    expect(passwordMock.verifyOrDummy).toHaveBeenCalledWith(
      'UnaClaveSegura123',
      undefined,
    );
  });
});
