export interface UsuarioAutenticado {
  sub: number;
  email: string;
  roles?: string[];
  iat?: number;
  exp?: number;
}
