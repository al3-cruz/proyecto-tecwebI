import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateObservacionDto } from './dto/create-observacion.dto';
import { UpdateObservacionDto } from './dto/update-observacion.dto';

// Estructura limpia y tipada para cada observación
export interface Observacion {
  id: number; // Cambiado a number para consistencia con ParseIntPipe
  tramiteId: number; // Cambiado a number para enlazar con los trámites
  descripcion: string;
  resuelta: boolean;
  fechaCreacion: Date;
}

@Injectable()
export class ObservacionesService {
  constructor(private readonly prisma: PrismaService) {}

  // Registro de prueba inicial con IDs numéricos
  private observaciones: Observacion[] = [
    {
      id: 1,
      tramiteId: 1,
      descripcion: 'Falta plano de fotogrametría',
      resuelta: false,
      fechaCreacion: new Date(),
    },
  ];

  private idCounter = 2; // Inicia en 2 porque ya creamos el ID 1 arriba

  // READ ALL: Lista todas o filtra las observaciones asociadas a un trámite específico
  findAll(tramiteId?: number): Observacion[] {
    if (tramiteId !== undefined) {
      return this.observaciones.filter((o) => o.tramiteId === tramiteId);
    }
    return this.observaciones;
  }

  // READ ONE: Busca una observación específica por su ID numérico (¡Faltaba!)
  findOne(id: number): Observacion {
    const observacion = this.observaciones.find((o) => o.id === id);
    if (!observacion) {
      throw new NotFoundException(
        `La observación con ID ${id} no fue encontrada.`,
      );
    }
    return observacion;
  }

  // CREATE: Registra una nueva observación para un trámite
  async create(dto: CreateObservacionDto): Promise<Observacion> {
    await this.assertTramiteExists(dto.tramiteId);
    const nueva: Observacion = Object.assign({}, dto, {
      id: this.idCounter++,
      resuelta: dto.resuelta ?? false,
      fechaCreacion: new Date(),
    });
    this.observaciones.push(nueva);
    return nueva;
  }

  async replace(id: number, dto: CreateObservacionDto): Promise<Observacion> {
    const observacion = this.findOne(id);
    await this.assertTramiteExists(dto.tramiteId);
    const replacement: Observacion = Object.assign({}, dto, {
      resuelta: dto.resuelta ?? false,
      id: observacion.id,
      fechaCreacion: observacion.fechaCreacion,
    });
    const index = this.observaciones.findIndex((item) => item.id === id);
    this.observaciones[index] = replacement;
    return replacement;
  }

  async update(
    id: number,
    updateObservacionDto: UpdateObservacionDto,
  ): Promise<Observacion> {
    const observacion = this.findOne(id); // Reutiliza la validación del 404
    if (updateObservacionDto.tramiteId !== undefined) {
      await this.assertTramiteExists(updateObservacionDto.tramiteId);
    }
    Object.assign(observacion, updateObservacionDto);
    return observacion;
  }

  // DELETE: Elimina permanentemente una observación
  remove(id: number): void {
    const index = this.observaciones.findIndex((o) => o.id === id);
    if (index === -1) {
      throw new NotFoundException(
        `No se puede eliminar: la observación con ID ${id} no existe.`,
      );
    }
    this.observaciones.splice(index, 1);
  }

  private async assertTramiteExists(tramiteId: number): Promise<void> {
    const tramite = await this.prisma.tramite.findUnique({
      where: { id: tramiteId },
      select: { id: true },
    });
    if (!tramite) {
      throw new NotFoundException(
        `El trámite con ID ${tramiteId} no fue encontrado.`,
      );
    }
  }
}
