import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Verifica que el usuario autenticado tenga uno de los roles requeridos por la
 * ruta (declarados con @Roles). Debe usarse DESPUÉS de AuthGuard('jwt'), que
 * coloca al usuario (con su relación `rol`) en request.user.
 *
 * Si la ruta no declara roles, permite el acceso a cualquier usuario autenticado.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // sin restricción de rol: basta estar autenticado
    }

    const request = context.switchToHttp().getRequest();
    const rolNombre = request.user?.rol?.nombre;

    if (!rolNombre || !requiredRoles.includes(rolNombre)) {
      throw new ForbiddenException(
        `Acceso denegado: se requiere uno de los roles [${requiredRoles.join(', ')}]`,
      );
    }
    return true;
  }
}
