import { HttpStatus } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaExceptionFilter } from './prisma-exception.filter';

describe('PrismaExceptionFilter', () => {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  const request = { url: '/api/v1/tramites' };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  };
  const filter = new PrismaExceptionFilter();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    ['P2002', HttpStatus.CONFLICT, 'Ya existe un registro con esos datos.'],
    ['P2025', HttpStatus.NOT_FOUND, 'No se encontró el registro solicitado.'],
    [
      'P2003',
      HttpStatus.BAD_REQUEST,
      'La operación referencia un registro relacionado inválido.',
    ],
  ])('maps %s to HTTP %i', (code, status, message) => {
    const exception = new Prisma.PrismaClientKnownRequestError(
      'Prisma request failed',
      { code, clientVersion: '7.10.1' },
    );

    filter.catch(exception, host as never);

    expect(response.status).toHaveBeenCalledWith(status);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: status,
        message,
        path: request.url,
      }),
    );
  });
});
