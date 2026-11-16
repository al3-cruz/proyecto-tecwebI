import { PartialType } from '@nestjs/mapped-types';
import { CreateObservacionDto } from './create-observacion.dto';

// Reutiliza las reglas de creación y vuelve opcionales los campos para el PATCH
export class UpdateObservacionDto extends PartialType(CreateObservacionDto) {}
