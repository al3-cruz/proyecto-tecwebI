import { Injectable, NotFoundException } from '@nestjs/common';
import { Tarea } from './interfaces/tarea.interface';
import { CrearTareaDto } from './dto/crear-tarea.dto';
import { ActualizarTareaDto } from './dto/actualizar-tarea.dto';

@Injectable()
export class TareasService {
  private tareas: Tarea[] = [
    {
      id: 1,
      titulo: 'Terminar Laboratorio 6',
      descripcion: 'Implementar el CRUD robusto y versionado en NestJS',
      completada: false,
    },
  ];

  private idCounter = 2;

  findAll(): Tarea[] {
    return this.tareas;
  }

  findOne(id: number): Tarea {
    const tarea = this.tareas.find((t) => t.id === id);
    if (!tarea) {
      throw new NotFoundException(`La tarea con ID ${id} no fue encontrada.`);
    }
    return tarea;
  }

  create(dto: CrearTareaDto): Tarea {
    const nuevaTarea: Tarea = Object.assign({}, dto, {
      id: this.idCounter++,
      completada: false,
    });
    this.tareas.push(nuevaTarea);
    return nuevaTarea;
  }

  replace(id: number, dto: CrearTareaDto): Tarea {
    const tarea = this.findOne(id);
    const replacement: Tarea = Object.assign({}, dto, {
      completada: false,
      id: tarea.id,
    });
    const index = this.tareas.findIndex((item) => item.id === id);
    this.tareas[index] = replacement;
    return replacement;
  }

  update(id: number, dto: ActualizarTareaDto): Tarea {
    const tarea = this.findOne(id);
    Object.assign(tarea, dto);
    return tarea;
  }

  remove(id: number): void {
    const index = this.tareas.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new NotFoundException(`No se puede eliminar: la tarea con ID ${id} no existe.`);
    }
    this.tareas.splice(index, 1);
  }
}
