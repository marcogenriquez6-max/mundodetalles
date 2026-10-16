import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { QueryFailedError, EntityNotFoundError } from 'typeorm';

/**
 * Traduce los errores de PostgreSQL a respuestas HTTP comprensibles, en lugar
 * de un genérico 500. Así un dato inválido nunca se reporta como falla del servidor.
 *  - 22P02 (texto con formato inválido, p. ej. un UUID mal formado) -> 400
 *  - 23505 (violación de unicidad: SKU, documento, código repetido)  -> 409
 *  - 23503 (clave foránea inexistente)                               -> 400
 *  - 23514 / 23502 (CHECK o NOT NULL)                                 -> 400
 */
@Catch(QueryFailedError, EntityNotFoundError)
export class QueryFailedFilter implements ExceptionFilter {
  private readonly logger = new Logger('QueryFailedFilter');

  catch(exception: any, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    if (exception instanceof EntityNotFoundError) {
      return res.status(HttpStatus.NOT_FOUND).json({ statusCode: 404, message: 'Recurso no encontrado', error: 'Not Found' });
    }

    const code: string | undefined = exception?.driverError?.code ?? exception?.code;
    const detail: string = exception?.driverError?.detail ?? '';
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Error interno del servidor';

    switch (code) {
      case '22P02':
      case '22007':
      case '22008':
        status = HttpStatus.BAD_REQUEST;
        message = 'Uno de los datos enviados no tiene un formato válido (identificador o fecha).';
        break;
      case '23505': {
        status = HttpStatus.CONFLICT;
        const campo = /Key \(([^)]+)\)/.exec(detail)?.[1];
        message = campo
          ? `Ya existe un registro con el mismo valor en "${campo.replace(/_/g, ' ')}".`
          : 'Ya existe un registro con esos datos.';
        break;
      }
      case '23503':
        status = HttpStatus.BAD_REQUEST;
        message = 'El registro hace referencia a otro que no existe o está en uso.';
        break;
      case '23514':
      case '23502':
        status = HttpStatus.BAD_REQUEST;
        message = 'Los datos no cumplen las reglas de validación de la base de datos.';
        break;
      default:
        this.logger.error(exception?.message, exception?.stack);
    }

    const error = status === HttpStatus.CONFLICT ? 'Conflict' : status === HttpStatus.BAD_REQUEST ? 'Bad Request' : 'Internal Server Error';
    res.status(status).json({ statusCode: status, message, error });
  }
}
