import { BadRequestException } from '@nestjs/common';
import { EstadoTramite } from '../generated/prisma/client.js';

const SIGUIENTE_ETAPA: Partial<Record<EstadoTramite, EstadoTramite>> = {
  [EstadoTramite.VENTANILLA_INFORMACIONES]: EstadoTramite.INSCRIPCION_RAPIDA,
  [EstadoTramite.INSCRIPCION_RAPIDA]: EstadoTramite.PRE_IMPRESION_REVISION,
  [EstadoTramite.PRE_IMPRESION_REVISION]: EstadoTramite.EN_PROCESO_REGISTRO,
  [EstadoTramite.EN_PROCESO_REGISTRO]: EstadoTramite.LISTO_PARA_DEVOLUCION,
  [EstadoTramite.LISTO_PARA_DEVOLUCION]: EstadoTramite.ENTREGADO,
};

export function siguienteEtapa(
  estado: EstadoTramite,
): EstadoTramite | undefined {
  return SIGUIENTE_ETAPA[estado];
}

export function sumarTresDiasHabiles(fecha: Date): Date {
  const resultado = new Date(fecha);
  let diasHabilesAgregados = 0;

  while (diasHabilesAgregados < 3) {
    resultado.setUTCDate(resultado.getUTCDate() + 1);
    const dia = resultado.getUTCDay();
    if (dia !== 0 && dia !== 6) {
      diasHabilesAgregados += 1;
    }
  }
  return resultado;
}

export function validarDatosApoderado(datos: {
  conApoderado: boolean;
  apoderadoNombre?: string | null;
  apoderadoDocumento?: string | null;
  numeroPoderNotarial?: string | null;
}): void {
  if (
    datos.conApoderado &&
    (!datos.apoderadoNombre?.trim() ||
      !datos.apoderadoDocumento?.trim() ||
      !datos.numeroPoderNotarial?.trim())
  ) {
    throw new BadRequestException(
      'Si el trámite se realiza con apoderado, indique su nombre, documento y número de poder notarial.',
    );
  }
}
