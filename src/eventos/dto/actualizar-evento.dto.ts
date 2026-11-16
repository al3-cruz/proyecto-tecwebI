import { PartialType } from '@nestjs/mapped-types';
import { CrearEventoDto } from './crear-evento.dto';

export class ActualizarEventoDto extends PartialType(CrearEventoDto) {}
