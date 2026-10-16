import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Restringe una ruta (o controlador) a los roles indicados por su nombre.
 * Ej: @Roles('Administrador', 'Cajero')
 * Sin este decorador, basta con estar autenticado (AuthGuard jwt).
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
