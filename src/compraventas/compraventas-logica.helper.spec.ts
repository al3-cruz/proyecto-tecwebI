import { BadRequestException } from '@nestjs/common';
import {
  sumarTresDiasHabiles,
  validarDatosApoderado,
} from './compraventas-logica.helper.js';

describe('Compraventas business helpers', () => {
  it('adds three working days while skipping weekends', () => {
    expect(sumarTresDiasHabiles(new Date('2026-03-06T12:00:00.000Z'))).toEqual(
      new Date('2026-03-11T12:00:00.000Z'),
    );
  });

  it('requires complete power-of-attorney details when an agent is used', () => {
    expect(() =>
      validarDatosApoderado({
        conApoderado: true,
        apoderadoNombre: '  ',
        apoderadoDocumento: '123',
        numeroPoderNotarial: 'P-1',
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      validarDatosApoderado({
        conApoderado: false,
      }),
    ).not.toThrow();
  });
});
