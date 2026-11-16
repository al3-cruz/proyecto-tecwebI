import { Injectable, NotFoundException } from '@nestjs/common';
import { Evento } from './interfaces/evento.interface';
import { CrearEventoDto } from './dto/crear-evento.dto';
import { ActualizarEventoDto } from './dto/actualizar-evento.dto';

@Injectable()
export class EventosService {
  private eventos: Evento[] = [
    {
      id: 1,
      nombre: 'Defensa de Proyecto Integrador',
      fecha: '2026-12-15',
      ubicacion: 'Auditorio Central de Ingeniería',
    },
  ];

  private idCounter = 2;

  findAll(): Evento[] {
    return this.eventos;
  }

  findOne(id: number): Evento {
    const evento = this.eventos.find((e) => e.id === id);
    if (!evento) {
      throw new NotFoundException(`El evento con ID ${id} no fue encontrado.`);
    }
    return evento;
  }

  create(dto: CrearEventoDto): Evento {
    const nuevoEvento: Evento = Object.assign({}, dto, { id: this.idCounter++ });
    this.eventos.push(nuevoEvento);
    return nuevoEvento;
  }

  replace(id: number, dto: CrearEventoDto): Evento {
    const evento = this.findOne(id);
    const replacement: Evento = Object.assign({}, dto, { id: evento.id });
    const index = this.eventos.findIndex((item) => item.id === id);
    this.eventos[index] = replacement;
    return replacement;
  }

  update(id: number, dto: ActualizarEventoDto): Evento {
    const evento = this.findOne(id);
    Object.assign(evento, dto);
    return evento;
  }

  remove(id: number): void {
    const index = this.eventos.findIndex((e) => e.id === id);
    if (index === -1) {
      throw new NotFoundException(`No se puede eliminar: el evento con ID ${id} no existe.`);
    }
    this.eventos.splice(index, 1);
  }
}
