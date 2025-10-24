import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

@Catch(QueryFailedError)
export class TypeORMExceptionFilter implements ExceptionFilter {

  async catch(exception: QueryFailedError, host: ArgumentsHost) {
    let response = host.switchToHttp().getResponse();
    switch (exception.name) {
      case 'QueryFailedError':
        return response.status(400).json( {
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'Solicitud incorrecta',
          message: exception.message,
        });
    }
  }


}
