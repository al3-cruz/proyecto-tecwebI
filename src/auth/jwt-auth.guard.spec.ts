import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

describe('JwtAuthGuard', () => {
  const jwtService = { verifyAsync: jest.fn() };
  const prisma = { usuario: { findFirst: jest.fn() } };
  const request = {
    headers: { authorization: 'Bearer valid-token' },
  };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  let guard: JwtAuthGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new JwtAuthGuard(
      jwtService as unknown as JwtService,
      prisma as unknown as PrismaService,
    );
    jwtService.verifyAsync.mockResolvedValue({
      sub: 7,
      email: 'persona@example.com',
    });
  });

  it('accepts a valid token only when its account is active', async () => {
    prisma.usuario.findFirst.mockResolvedValue({ id: 7 });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(prisma.usuario.findFirst).toHaveBeenCalledWith({
      where: { id: 7, deletedAt: null },
      select: { id: true },
    });
    expect(request).toHaveProperty('user.sub', 7);
  });

  it('rejects tokens belonging to soft-deleted accounts', async () => {
    prisma.usuario.findFirst.mockResolvedValue(null);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
