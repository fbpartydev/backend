import { HttpStatus, HttpException } from '@nestjs/common';

export abstract class ErrorFactory {

  static throwBadRequest400(message: string) {
    throw new HttpException({
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'Solicitud incorrecta',
      message,
    }, 400);
  }

  static throwUnauthorized401(message: string) {
    throw new HttpException({
      statusCode: HttpStatus.UNAUTHORIZED,
      error: 'Sin autorización',
      message,
    }, 401);
  }

  static throwNotFound404(message: string) {
    throw new HttpException({
      statusCode: HttpStatus.NOT_FOUND,
      error: 'Recurso no encontrado',
      message,
    }, 404);
  }

  static throwServerError500(message: string) {
    throw new HttpException({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Error interno del servidor',
      message,
    }, 500);
  }
}
