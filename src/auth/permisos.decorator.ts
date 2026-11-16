import { SetMetadata } from '@nestjs/common';

export const REQUIRED_PERMISSIONS = 'requiredPermissions';
export const Permisos = (...permissions: string[]) =>
  SetMetadata(REQUIRED_PERMISSIONS, permissions);
