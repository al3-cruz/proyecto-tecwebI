import {
  sumarDiasHabiles,
  verificarRequisitos,
} from './tramites-logica.helper';

describe('tramites-logica.helper', () => {
  it('adds working days while skipping Saturday and Sunday', () => {
    expect(sumarDiasHabiles('2026-11-12', 2).toISOString()).toBe(
      '2026-11-16T00:00:00.000Z',
    );
  });

  it('reports missing mandatory and optional documents separately', () => {
    expect(
      verificarRequisitos(
        [
          { id: 1, detalle: 'Documento obligatorio', obligatorio: true },
          { id: 2, detalle: 'Documento opcional', obligatorio: false },
        ],
        [],
      ),
    ).toEqual({
      aptoParaIniciar: false,
      requisitosObligatoriosFaltantes: [
        { id: 1, descripcion: 'Documento obligatorio' },
      ],
      requisitosOpcionalesFaltantes: [
        { id: 2, descripcion: 'Documento opcional' },
      ],
      porcentajeCumplimiento: 0,
    });
  });
});
