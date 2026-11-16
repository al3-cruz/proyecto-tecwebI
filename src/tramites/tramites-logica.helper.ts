export interface RequisitoVerificable {
  id: number;
  detalle: string;
  obligatorio: boolean;
}

export interface ResultadoVerificacionRequisitos {
  aptoParaIniciar: boolean;
  requisitosObligatoriosFaltantes: Array<{ id: number; descripcion: string }>;
  requisitosOpcionalesFaltantes: Array<{ id: number; descripcion: string }>;
  porcentajeCumplimiento: number;
}

export function verificarRequisitos(
  requisitos: RequisitoVerificable[],
  requisitosCumplidosIds: number[],
): ResultadoVerificacionRequisitos {
  const cumplidos = new Set(requisitosCumplidosIds);
  const faltantes = requisitos
    .filter((requisito) => !cumplidos.has(requisito.id))
    .map(({ id, detalle, obligatorio }) => ({
      id,
      descripcion: detalle,
      obligatorio,
    }));
  const obligatorios = faltantes
    .filter((requisito) => requisito.obligatorio)
    .map(({ id, descripcion }) => ({ id, descripcion }));
  const opcionales = faltantes
    .filter((requisito) => !requisito.obligatorio)
    .map(({ id, descripcion }) => ({ id, descripcion }));
  const porcentajeCumplimiento =
    requisitos.length === 0
      ? 100
      : Math.round(
          ((requisitos.length - faltantes.length) / requisitos.length) * 100,
        );

  return {
    aptoParaIniciar: obligatorios.length === 0,
    requisitosObligatoriosFaltantes: obligatorios,
    requisitosOpcionalesFaltantes: opcionales,
    porcentajeCumplimiento,
  };
}

export function sumarDiasHabiles(
  fechaInicio: string | Date,
  diasHabiles: number,
): Date {
  const fecha =
    typeof fechaInicio === 'string'
      ? new Date(`${fechaInicio.slice(0, 10)}T00:00:00.000Z`)
      : new Date(
          Date.UTC(
            fechaInicio.getUTCFullYear(),
            fechaInicio.getUTCMonth(),
            fechaInicio.getUTCDate(),
          ),
        );

  let sumados = 0;
  while (sumados < diasHabiles) {
    fecha.setUTCDate(fecha.getUTCDate() + 1);
    const diaSemana = fecha.getUTCDay();
    if (diaSemana !== 0 && diaSemana !== 6) {
      sumados += 1;
    }
  }
  return fecha;
}
