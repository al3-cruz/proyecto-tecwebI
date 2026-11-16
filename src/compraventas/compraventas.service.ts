import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EstadoTramite,
  Prisma,
  TipoRequisitoCompraventa,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ActualizarTramiteDto } from './dto/actualizar-tramite.dto.js';
import { AvanzarEtapaDto } from './dto/avanzar-etapa.dto.js';
import { CrearTramiteDto } from './dto/crear-tramite.dto.js';
import { VerificarRequisitoDto } from './dto/verificar-requisito.dto.js';
import {
  siguienteEtapa,
  sumarTresDiasHabiles,
  validarDatosApoderado,
} from './compraventas-logica.helper.js';

const tramiteInclude = {
  requisitos: { orderBy: { tipoRequisito: 'asc' } },
} satisfies Prisma.TramiteCompraventaInclude;

const REQUISITOS_BASE: TipoRequisitoCompraventa[] = [
  TipoRequisitoCompraventa.TITULO_TRANSFERENCIA,
  TipoRequisitoCompraventa.IMPUESTO_ANUAL_IMPBI,
  TipoRequisitoCompraventa.IMPUESTO_TRANSFERENCIA,
  TipoRequisitoCompraventa.PLANO_Y_CERTIFICADO_CATASTRAL,
  TipoRequisitoCompraventa.CEDULA_IDENTIDAD_O_NIT,
];

export type TramiteCompraventaConRequisitos =
  Prisma.TramiteCompraventaGetPayload<{ include: typeof tramiteInclude }>;

@Injectable()
export class CompraventasService {
  constructor(private readonly prisma: PrismaService) {}

  async crear(
    dto: CrearTramiteDto,
    usuarioId: number,
  ): Promise<TramiteCompraventaConRequisitos> {
    validarDatosApoderado(dto);

    return this.prisma.$transaction(async (tx) => {
      const fechaIngreso = new Date();
      const secuencia = await tx.secuenciaTramiteCompraventa.upsert({
        where: { anio: fechaIngreso.getUTCFullYear() },
        create: { anio: fechaIngreso.getUTCFullYear(), ultimo: 1 },
        update: { ultimo: { increment: 1 } },
      });
      const codigoTramite = `DDRR-CV-${secuencia.anio}-${String(
        secuencia.ultimo,
      ).padStart(4, '0')}`;
      const requisitos = dto.conApoderado
        ? [...REQUISITOS_BASE, TipoRequisitoCompraventa.PODER_NOTARIADO]
        : REQUISITOS_BASE;

      return tx.tramiteCompraventa.create({
        data: {
          codigoTramite,
          folioReal: dto.folioReal.trim(),
          fechaIngreso,
          fechaEstimadaEntrega: sumarTresDiasHabiles(fechaIngreso),
          vendedorNombre: dto.vendedorNombre.trim(),
          vendedorDocumento: dto.vendedorDocumento.trim(),
          compradorNombre: dto.compradorNombre.trim(),
          compradorDocumento: dto.compradorDocumento.trim(),
          esBienGanancial: dto.esBienGanancial,
          conApoderado: dto.conApoderado,
          apoderadoNombre: dto.apoderadoNombre?.trim() ?? null,
          apoderadoDocumento: dto.apoderadoDocumento?.trim() ?? null,
          numeroPoderNotarial: dto.numeroPoderNotarial?.trim() ?? null,
          montoArancel: new Prisma.Decimal(dto.montoArancel),
          observaciones: dto.observaciones?.trim() || null,
          usuarioId,
          requisitos: {
            create: requisitos.map((tipoRequisito) => ({ tipoRequisito })),
          },
        },
        include: tramiteInclude,
      });
    });
  }

  async listar(
    usuarioId: number,
    esAdmin: boolean,
  ): Promise<TramiteCompraventaConRequisitos[]> {
    return this.prisma.tramiteCompraventa.findMany({
      where: esAdmin ? undefined : { usuarioId },
      include: tramiteInclude,
      orderBy: { fechaIngreso: 'desc' },
    });
  }

  async obtener(
    id: number,
    usuarioId: number,
    esAdmin: boolean,
  ): Promise<TramiteCompraventaConRequisitos> {
    const tramite = await this.prisma.tramiteCompraventa.findFirst({
      where: esAdmin ? { id } : { id, usuarioId },
      include: tramiteInclude,
    });
    if (!tramite) {
      throw new NotFoundException(`El trámite ${id} no existe.`);
    }
    return tramite;
  }

  async actualizar(
    id: number,
    dto: ActualizarTramiteDto,
    usuarioId: number,
    esAdmin: boolean,
  ): Promise<TramiteCompraventaConRequisitos> {
    return this.prisma.$transaction(async (tx) => {
      const tramite = await this.buscarEnTransaccion(
        tx,
        id,
        usuarioId,
        esAdmin,
      );
      if (
        dto.montoArancel === undefined &&
        dto.arancelPagado === undefined &&
        dto.observaciones === undefined
      ) {
        throw new BadRequestException(
          'Debe indicar al menos un campo para actualizar.',
        );
      }
      if (
        dto.arancelPagado !== undefined &&
        tramite.estado !== EstadoTramite.INSCRIPCION_RAPIDA
      ) {
        throw new BadRequestException(
          'El pago del arancel solo se puede registrar en Inscripción Rápida.',
        );
      }
      if (
        dto.montoArancel !== undefined &&
        (tramite.arancelPagado ||
          (tramite.estado !== EstadoTramite.VENTANILLA_INFORMACIONES &&
            tramite.estado !== EstadoTramite.INSCRIPCION_RAPIDA))
      ) {
        throw new BadRequestException(
          'No se puede modificar el arancel después de su pago o entrega.',
        );
      }

      return tx.tramiteCompraventa.update({
        where: { id },
        data: {
          ...(dto.montoArancel === undefined
            ? {}
            : { montoArancel: new Prisma.Decimal(dto.montoArancel) }),
          ...(dto.arancelPagado === undefined
            ? {}
            : { arancelPagado: dto.arancelPagado }),
          ...(dto.observaciones === undefined
            ? {}
            : { observaciones: dto.observaciones?.trim() || null }),
        },
        include: tramiteInclude,
      });
    });
  }

  async verificarRequisito(
    id: number,
    requisitoId: number,
    dto: VerificarRequisitoDto,
    usuarioId: number,
    esAdmin: boolean,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const tramite = await this.buscarEnTransaccion(
        tx,
        id,
        usuarioId,
        esAdmin,
      );
      if (tramite.estado !== EstadoTramite.VENTANILLA_INFORMACIONES) {
        throw new BadRequestException(
          'Los requisitos solo se pueden verificar en Ventanilla de Informaciones.',
        );
      }

      const requisito = await tx.requisitoCompraventa.findFirst({
        where: { id: requisitoId, tramiteId: id },
      });
      if (!requisito) {
        throw new NotFoundException(
          `El requisito ${requisitoId} no pertenece al trámite ${id}.`,
        );
      }
      if (
        dto.verificado &&
        (!dto.presentoOriginal || dto.cantidadFotocopias < 2)
      ) {
        throw new BadRequestException(
          'Para verificar el requisito debe presentarse el original y al menos dos fotocopias.',
        );
      }

      return tx.requisitoCompraventa.update({
        where: { id: requisitoId },
        data: {
          presentoOriginal: dto.presentoOriginal,
          cantidadFotocopias: dto.cantidadFotocopias,
          verificado: dto.verificado,
        },
      });
    });
  }

  async confirmarPreimpresion(
    id: number,
    usuarioId: number,
    esAdmin: boolean,
  ): Promise<TramiteCompraventaConRequisitos> {
    return this.prisma.$transaction(async (tx) => {
      const tramite = await this.buscarEnTransaccion(
        tx,
        id,
        usuarioId,
        esAdmin,
      );
      if (tramite.estado !== EstadoTramite.PRE_IMPRESION_REVISION) {
        throw new BadRequestException(
          'La pre-impresión solo se puede confirmar durante su etapa de revisión.',
        );
      }
      return tx.tramiteCompraventa.update({
        where: { id },
        data: { preImpresionConfirmada: true },
        include: tramiteInclude,
      });
    });
  }

  async avanzarEtapa(
    id: number,
    dto: AvanzarEtapaDto,
    usuarioId: number,
    esAdmin: boolean,
  ): Promise<TramiteCompraventaConRequisitos> {
    return this.prisma.$transaction(async (tx) => {
      const tramite = await this.buscarEnTransaccion(
        tx,
        id,
        usuarioId,
        esAdmin,
      );
      if (dto.estado === EstadoTramite.OBSERVADO) {
        if (
          tramite.estado === EstadoTramite.ENTREGADO ||
          tramite.estado === EstadoTramite.OBSERVADO
        ) {
          throw new BadRequestException(
            'No se puede observar un trámite entregado o ya observado.',
          );
        }
        if (!dto.observaciones?.trim()) {
          throw new BadRequestException(
            'Indique el motivo para marcar el trámite como observado.',
          );
        }
        return tx.tramiteCompraventa.update({
          where: { id },
          data: {
            estado: EstadoTramite.OBSERVADO,
            estadoAnterior: tramite.estado,
            observaciones: dto.observaciones.trim(),
          },
          include: tramiteInclude,
        });
      }

      if (tramite.estado === EstadoTramite.OBSERVADO) {
        if (!tramite.estadoAnterior || dto.estado !== tramite.estadoAnterior) {
          throw new BadRequestException(
            'Un trámite observado solo puede regresar a la etapa en la que fue observado.',
          );
        }
        return tx.tramiteCompraventa.update({
          where: { id },
          data: {
            estado: tramite.estadoAnterior,
            estadoAnterior: null,
            ...(dto.observaciones === undefined
              ? {}
              : { observaciones: dto.observaciones.trim() || null }),
          },
          include: tramiteInclude,
        });
      }

      if (siguienteEtapa(tramite.estado) !== dto.estado) {
        throw new BadRequestException(
          'El trámite solo puede avanzar a la siguiente etapa del procedimiento.',
        );
      }

      if (dto.estado === EstadoTramite.INSCRIPCION_RAPIDA) {
        const cantidadRequisitosEsperada =
          REQUISITOS_BASE.length + (tramite.conApoderado ? 1 : 0);
        const requisitosObligatorios = tramite.requisitos.filter(
          (requisito) =>
            requisito.tipoRequisito !==
              TipoRequisitoCompraventa.PODER_NOTARIADO || tramite.conApoderado,
        );
        if (
          requisitosObligatorios.length !== cantidadRequisitosEsperada ||
          requisitosObligatorios.some(
            (requisito) =>
              !requisito.verificado ||
              !requisito.presentoOriginal ||
              requisito.cantidadFotocopias < 2,
          )
        ) {
          throw new BadRequestException(
            'Todos los requisitos obligatorios deben estar verificados con original y dos fotocopias.',
          );
        }
      }
      if (
        dto.estado === EstadoTramite.PRE_IMPRESION_REVISION &&
        !tramite.arancelPagado
      ) {
        throw new BadRequestException(
          'Registre el pago del arancel antes de continuar a la pre-impresión.',
        );
      }
      if (
        dto.estado === EstadoTramite.EN_PROCESO_REGISTRO &&
        !tramite.preImpresionConfirmada
      ) {
        throw new BadRequestException(
          'El usuario debe confirmar la pre-impresión antes de iniciar el registro.',
        );
      }
      if (
        dto.estado === EstadoTramite.ENTREGADO &&
        (!dto.folioRealConfirmado || !dto.testimonioSelladoConfirmado)
      ) {
        throw new BadRequestException(
          'Confirme la entrega del Folio Real actualizado y del Testimonio sellado.',
        );
      }

      return tx.tramiteCompraventa.update({
        where: { id },
        data: {
          estado: dto.estado,
          estadoAnterior: null,
          ...(dto.estado === EstadoTramite.INSCRIPCION_RAPIDA ||
          dto.estado === EstadoTramite.EN_PROCESO_REGISTRO
            ? { fechaEstimadaEntrega: sumarTresDiasHabiles(new Date()) }
            : {}),
          ...(dto.estado === EstadoTramite.ENTREGADO
            ? { fechaEntregaReal: new Date() }
            : {}),
        },
        include: tramiteInclude,
      });
    });
  }

  async eliminar(
    id: number,
    usuarioId: number,
    esAdmin: boolean,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const tramite = await this.buscarEnTransaccion(
        tx,
        id,
        usuarioId,
        esAdmin,
      );
      if (
        tramite.estado === EstadoTramite.EN_PROCESO_REGISTRO ||
        tramite.estado === EstadoTramite.ENTREGADO
      ) {
        throw new BadRequestException(
          'No se puede eliminar un trámite en proceso de registro o ya entregado.',
        );
      }
      await tx.tramiteCompraventa.delete({ where: { id } });
    });
  }

  private async buscarEnTransaccion(
    tx: Prisma.TransactionClient,
    id: number,
    usuarioId: number,
    esAdmin: boolean,
  ): Promise<TramiteCompraventaConRequisitos> {
    const tramite = await tx.tramiteCompraventa.findFirst({
      where: esAdmin ? { id } : { id, usuarioId },
      include: tramiteInclude,
    });
    if (!tramite) {
      throw new NotFoundException(`El trámite ${id} no existe.`);
    }
    return tramite;
  }
}
